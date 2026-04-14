"""
Background LLM fine-tuning service using HuggingFace PEFT/TRL.
Supports LoRA, QLoRA (4-bit), and full fine-tuning.

Runs each job in a daemon thread and updates progress in the DB.
"""
from __future__ import annotations

import os
import json
import threading
import logging
from datetime import datetime
from typing import Dict

logger = logging.getLogger(__name__)

# job_id -> threading.Event
_cancel_flags: Dict[int, threading.Event] = {}

# Available base models with metadata
AVAILABLE_MODELS = [
    {
        "id": "microsoft/Phi-3.5-mini-instruct",
        "name": "Phi-3.5 Mini Instruct",
        "size": "3.8B",
        "type": "instruct",
        "description": "Microsoft's compact instruction-tuned model, great for edge deployment.",
        "recommended": True,
    },
    {
        "id": "google/gemma-2b-it",
        "name": "Gemma 2B Instruct",
        "size": "2B",
        "type": "instruct",
        "description": "Google's lightweight instruction-tuned model. Fast training.",
        "recommended": True,
    },
    {
        "id": "mistralai/Mistral-7B-Instruct-v0.2",
        "name": "Mistral 7B Instruct v0.2",
        "size": "7B",
        "type": "instruct",
        "description": "Mistral's popular 7B instruction-tuned model. Strong reasoning.",
        "recommended": False,
    },
    {
        "id": "meta-llama/Llama-3.2-1B-Instruct",
        "name": "LLaMA 3.2 1B Instruct",
        "size": "1B",
        "type": "instruct",
        "description": "Meta's smallest LLaMA 3.2 model. Very fast training, minimal VRAM.",
        "recommended": False,
    },
]


def start_llm_training_job(app, job_id: int) -> None:
    """Spawn a background daemon thread for job_id."""
    cancel_event = threading.Event()
    _cancel_flags[job_id] = cancel_event

    t = threading.Thread(
        target=_llm_training_thread,
        args=(app, job_id, cancel_event),
        daemon=True,
        name=f"llm-train-{job_id}",
    )
    t.start()


def cancel_llm_job(job_id: int) -> None:
    """Signal the training thread to stop."""
    if job_id in _cancel_flags:
        _cancel_flags[job_id].set()


def reset_stuck_llm_jobs(app) -> None:
    """Called at startup to reset any jobs stuck in 'running' state."""
    with app.app_context():
        try:
            from app.extensions import db
            from app.models import LlmJob
            stuck = LlmJob.query.filter_by(status="running").all()
            for job in stuck:
                job.status = "failed"
                job.error_message = "Server restarted while job was running."
            if stuck:
                db.session.commit()
        except Exception as exc:
            logger.warning("reset_stuck_llm_jobs failed: %s", exc)


# ── Training thread ────────────────────────────────────────────────────────────

def _llm_training_thread(app, job_id: int, cancel_event: threading.Event) -> None:
    with app.app_context():
        from app.extensions import db
        from app.models import LlmJob

        job = db.session.get(LlmJob, job_id)
        if not job:
            return

        # Setup output and log paths
        output_root = os.path.join(
            app.config.get("TRAINING_OUTPUT_DIR", "training_runs"),
            "llm_jobs", str(job_id)
        )
        os.makedirs(output_root, exist_ok=True)
        log_path = os.path.join(output_root, "train.log")

        job.status = "running"
        job.started_at = datetime.utcnow()
        job.output_dir = output_root
        job.log_file = log_path
        db.session.commit()

        def _log(msg: str):
            logger.info("[LLM-JOB-%d] %s", job_id, msg)
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"[{datetime.utcnow().strftime('%H:%M:%S')}] {msg}\n")

        def _fail(msg: str):
            with app.app_context():
                j = db.session.get(LlmJob, job_id)
                if j:
                    j.status = "failed"
                    j.error_message = msg
                    j.completed_at = datetime.utcnow()
                    db.session.commit()
            _log(f"ERROR: {msg}")

        try:
            _log(f"Starting LLM fine-tuning job {job_id}")
            _log(f"Base model: {job.base_model}")
            _log(f"Technique:  {job.technique}")
            _log(f"Epochs:     {job.epochs}, Batch: {job.batch_size}")
            _log(f"LoRA r={job.lora_r}, alpha={job.lora_alpha}, dropout={job.lora_dropout}")
            _log(f"Learning rate: {job.learning_rate}")

            # ── Check dependencies ──────────────────────────────────────────
            try:
                import transformers  # noqa
                import peft          # noqa
                import trl           # noqa
                import datasets      # noqa
            except ImportError as e:
                _fail(
                    f"Missing dependency: {e}. "
                    "Install with: pip install peft>=0.11.0 trl>=0.9.0 datasets>=2.20.0 transformers"
                )
                return

            if job.technique == "qlora":
                try:
                    import bitsandbytes  # noqa
                except ImportError:
                    _fail("QLoRA requires bitsandbytes. Install: pip install bitsandbytes")
                    return

            # ── Load dataset ────────────────────────────────────────────────
            _log("Loading dataset...")
            dataset_path = job.dataset_path
            if not dataset_path or not os.path.exists(dataset_path):
                _fail(f"Dataset file not found: {dataset_path}")
                return

            records = []
            with open(dataset_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            records.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue

            if not records:
                _fail("Dataset is empty or contains no valid JSONL records.")
                return

            _log(f"Loaded {len(records)} training examples.")

            from datasets import Dataset  # type: ignore

            hf_dataset = Dataset.from_list(records)

            # ── Load tokenizer ──────────────────────────────────────────────
            _log("Loading tokenizer...")
            from transformers import AutoTokenizer  # type: ignore

            tokenizer = AutoTokenizer.from_pretrained(
                job.base_model, trust_remote_code=True
            )
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # ── Format dataset ──────────────────────────────────────────────
            def _format_example(example: dict) -> dict:
                instruction = example.get("instruction", "")
                inp = example.get("input", "")
                output = example.get("output", "")
                if inp:
                    text = (
                        f"### Instruction:\n{instruction}\n\n"
                        f"### Input:\n{inp}\n\n"
                        f"### Response:\n{output}"
                    )
                else:
                    text = (
                        f"### Instruction:\n{instruction}\n\n"
                        f"### Response:\n{output}"
                    )
                return {"text": text}

            hf_dataset = hf_dataset.map(_format_example, remove_columns=hf_dataset.column_names)

            # ── Load model ──────────────────────────────────────────────────
            import torch  # type: ignore
            from transformers import AutoModelForCausalLM, TrainingArguments, BitsAndBytesConfig  # type: ignore
            from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training  # type: ignore
            from trl import SFTTrainer  # type: ignore

            device_map = "auto" if torch.cuda.is_available() else "cpu"
            _log(f"Device: {'CUDA GPU' if torch.cuda.is_available() else 'CPU (slow)'}")

            if job.technique == "qlora":
                _log("Loading model with 4-bit quantization (QLoRA)...")
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                )
                model = AutoModelForCausalLM.from_pretrained(
                    job.base_model,
                    quantization_config=bnb_config,
                    device_map=device_map,
                    trust_remote_code=True,
                )
                model = prepare_model_for_kbit_training(model)
            else:
                _log("Loading model in full precision...")
                model = AutoModelForCausalLM.from_pretrained(
                    job.base_model,
                    device_map=device_map,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    trust_remote_code=True,
                )

            if cancel_event.is_set():
                _fail("Cancelled by user.")
                return

            # ── LoRA config ─────────────────────────────────────────────────
            if job.technique in ("lora", "qlora"):
                _log(f"Applying LoRA (r={job.lora_r}, alpha={job.lora_alpha})...")
                lora_config = LoraConfig(
                    r=job.lora_r,
                    lora_alpha=job.lora_alpha,
                    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
                    lora_dropout=job.lora_dropout,
                    bias="none",
                    task_type="CAUSAL_LM",
                )
                model = get_peft_model(model, lora_config)
                model.print_trainable_parameters()

            # ── Training arguments ──────────────────────────────────────────
            training_args = TrainingArguments(
                output_dir=output_root,
                num_train_epochs=job.epochs,
                per_device_train_batch_size=job.batch_size,
                gradient_accumulation_steps=4,
                learning_rate=job.learning_rate,
                fp16=torch.cuda.is_available(),
                logging_steps=1,
                save_strategy="epoch",
                report_to=[],
                optim="paged_adamw_8bit" if job.technique == "qlora" else "adamw_torch",
                warmup_ratio=0.03,
                lr_scheduler_type="cosine",
            )

            # ── Progress callback ───────────────────────────────────────────
            from transformers import TrainerCallback  # type: ignore

            class _ProgressCallback(TrainerCallback):
                def on_log(self, args, state, control, logs=None, **kwargs):
                    if cancel_event.is_set():
                        control.should_training_stop = True
                        return

                    if logs and state.max_steps > 0:
                        pct = int(100 * state.global_step / state.max_steps)
                        loss = logs.get("loss")
                        _log(
                            f"Step {state.global_step}/{state.max_steps} "
                            f"({pct}%) | loss={loss:.4f}" if loss else
                            f"Step {state.global_step}/{state.max_steps} ({pct}%)"
                        )
                        with app.app_context():
                            j = db.session.get(LlmJob, job_id)
                            if j:
                                j.progress = pct
                                if loss:
                                    j.train_loss = round(loss, 4)
                                db.session.commit()

            # ── SFTTrainer ──────────────────────────────────────────────────
            _log("Starting SFTTrainer...")
            trainer = SFTTrainer(
                model=model,
                args=training_args,
                train_dataset=hf_dataset,
                tokenizer=tokenizer,
                dataset_text_field="text",
                max_seq_length=512,
                callbacks=[_ProgressCallback()],
            )

            trainer.train()

            if cancel_event.is_set():
                _fail("Cancelled by user during training.")
                return

            # ── Save model ──────────────────────────────────────────────────
            _log("Saving adapter weights...")
            adapter_path = os.path.join(output_root, "adapter")
            trainer.save_model(adapter_path)
            tokenizer.save_pretrained(adapter_path)
            _log(f"Adapter saved to: {adapter_path}")

            # Update job
            j = db.session.get(LlmJob, job_id)
            if j:
                j.status = "completed"
                j.progress = 100
                j.output_dir = adapter_path
                j.completed_at = datetime.utcnow()
                db.session.commit()

            _log("Fine-tuning completed successfully!")
            _log(f"Adapter weights: {adapter_path}")

        except Exception as exc:
            logger.exception("LLM training thread error for job %d", job_id)
            _fail(str(exc))
        finally:
            _cancel_flags.pop(job_id, None)

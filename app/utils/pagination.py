from flask import request, current_app


def paginate(query):
    """
    Extract page/per_page from request args, apply to SQLAlchemy query,
    and return (items_list, pagination_dict).
    """
    try:
        page     = max(1, int(request.args.get("page", 1)))
        per_page = min(
            int(request.args.get("per_page", current_app.config["DEFAULT_PAGE_SIZE"])),
            current_app.config["MAX_PAGE_SIZE"],
        )
    except (ValueError, TypeError):
        page     = 1
        per_page = current_app.config["DEFAULT_PAGE_SIZE"]

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    pagination = {
        "page":        paginated.page,
        "per_page":    paginated.per_page,
        "total_items": paginated.total,
        "total_pages": paginated.pages,
        "has_next":    paginated.has_next,
        "has_prev":    paginated.has_prev,
    }
    return paginated.items, pagination

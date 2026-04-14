from marshmallow import Schema, fields, validate, EXCLUDE


class CameraSchema(Schema):
    class Meta:
        unknown = EXCLUDE   # silently drop unknown fields from any form

    name           = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    rtsp_url       = fields.Str(load_default="", validate=validate.Length(max=512))
    ip_address     = fields.Str(load_default="", validate=validate.Length(max=45))
    location       = fields.Str(load_default=None, validate=validate.Length(max=255))
    camera_type    = fields.Str(load_default="generic")
    status         = fields.Str(
                       load_default="inactive",
                       validate=validate.OneOf(["active", "inactive", "error"]),
                     )
    fps            = fields.Int(load_default=30)
    resolution     = fields.Str(load_default="1920x1080")
    hardware_model = fields.Str(load_default=None)


class DetectedObjectSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    label      = fields.Str(required=True)
    confidence = fields.Float(required=True, validate=validate.Range(min=0.0, max=1.0))
    x1         = fields.Int(required=True)
    y1         = fields.Int(required=True)
    x2         = fields.Int(required=True)
    y2         = fields.Int(required=True)


class DetectionEventSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    camera_id     = fields.Int(required=True)
    detected_at   = fields.DateTime(load_default=None)
    event_type    = fields.Str(load_default="object_detection")
    snapshot_path = fields.Str(load_default=None)
    objects       = fields.List(fields.Dict(), load_default=[])


class AlertSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    camera_id  = fields.Int(required=True)
    event_id   = fields.Int(load_default=None)
    alert_type = fields.Str(load_default="detection")
    message    = fields.Str(required=True)
    status     = fields.Str(
                   load_default="unresolved",
                   validate=validate.OneOf(["unresolved", "acknowledged", "resolved"]),
                 )


# Instantiated schemas for reuse
camera_schema = CameraSchema()
event_schema  = DetectionEventSchema()
alert_schema  = AlertSchema()
obj_schema    = DetectedObjectSchema()

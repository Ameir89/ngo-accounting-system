# import os
# from flask_cors import CORS

# def setup_cors(app):
#     """Setup CORS configuration"""

#     flask_env = os.getenv("FLASK_ENV", "production")
#     print(f"✅ FLASK_ENV: {flask_env}")

#     if flask_env == "development":
#         # Development CORS - more permissive
#         origins = [
#             "http://localhost:3000",
#             "http://127.0.0.1:3000",
#             "http://localhost:3001",
#             "http://127.0.0.1:3001"
#         ]
#         CORS(
#             app,
#             origins=origins,             # must be specific, not '*'
#             supports_credentials=True,   # ✅ important
#             methods=["GET","POST","PUT","DELETE","OPTIONS","PATCH"],
#             allow_headers=["Content-Type","Authorization","X-Requested-With","X-CSRF-Token","Accept","Origin"],
#             expose_headers=["X-Total-Count","X-Page-Count"],
#         )
#     else:
#         # Production CORS - restrictive
#         allowed_origins = app.config.get("CORS_ORIGINS", [])
#         if isinstance(allowed_origins, str):
#             # allow comma-separated env var like: "https://app.com,https://admin.app.com"
#             allowed_origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]

#         CORS(
#             app,
#             origins=allowed_origins,
#             methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#             allow_headers=["Content-Type", "Authorization"],
#             # supports_credentials=True,
#             # max_age=3600
#         )
from flask_cors import CORS

def setup_cors(app):
    # Allowed origins for development
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]

    CORS(
        app,
        origins=origins,             # must be specific, not '*'
        supports_credentials=True,   # ✅ required for cookies/auth
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
            "Accept",
            "Origin"
        ],
        expose_headers=["X-Total-Count", "X-Page-Count"],
    )

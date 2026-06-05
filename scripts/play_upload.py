#!/usr/bin/env python3
"""Upload a signed AAB to a Google Play track via the Play Developer API.

Usage:
  play_upload.py <aab_path> <package_name> <track>

Auth: a service-account JSON whose path is in PLAY_SERVICE_ACCOUNT_FILE.
The service account must have release permission on the Play account.
"""
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPE = "https://www.googleapis.com/auth/androidpublisher"


def main():
    if len(sys.argv) != 4:
        sys.exit("usage: play_upload.py <aab_path> <package_name> <track>")
    aab, package, track = sys.argv[1], sys.argv[2], sys.argv[3]
    sa_file = os.environ["PLAY_SERVICE_ACCOUNT_FILE"]

    creds = service_account.Credentials.from_service_account_file(
        sa_file, scopes=[SCOPE]
    )
    service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)
    edits = service.edits()

    edit_id = edits.insert(packageName=package, body={}).execute()["id"]
    media = MediaFileUpload(aab, mimetype="application/octet-stream", resumable=True)
    bundle = edits.bundles().upload(
        packageName=package, editId=edit_id, media_body=media
    ).execute()
    version_code = bundle["versionCode"]
    print(f"Uploaded bundle versionCode={version_code}")

    edits.tracks().update(
        packageName=package,
        editId=edit_id,
        track=track,
        body={"releases": [{"versionCodes": [version_code], "status": "completed"}]},
    ).execute()
    edits.commit(packageName=package, editId=edit_id).execute()
    print(f"Committed release {version_code} to track '{track}' for {package}")


if __name__ == "__main__":
    main()

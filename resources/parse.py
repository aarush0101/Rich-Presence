"""
resources/prase.py
------------------

Implements a script to parse a JSON schema file and extract
release information such as title, description, and tag.
It encodes the description in base64 for use in GitHub Actions.

:license: MIT - see LICENSE for more details
:copyright: (c) 2025-present AARUSH MASTER
"""

import base64
import orjson
import os


def sanitize_string(s):
    return s.strip()


def main():
    with open("./temp/schema.json", "rb") as f:
        config = orjson.loads(f.read())
        title = sanitize_string(config.get("title", ""))
        description = config.get("description", "")
        tag = sanitize_string(config.get("tag", ""))

        # Encode markdown description as base64
        encoded_description = base64.b64encode(description.encode("utf-8")).decode(
            "utf-8"
        )

        with open(os.environ["GITHUB_OUTPUT"], "a") as output_file:
            output_file.write(f"release_title={title}\n")
            output_file.write(f"release_description_b64={encoded_description}\n")
            output_file.write(f"release_tag={tag}\n")


if __name__ == "__main__":
    main()

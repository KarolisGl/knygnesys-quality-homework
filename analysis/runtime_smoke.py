#!/usr/bin/env python3
"""Disposable end-to-end smoke test for the public Knygnesys backend.

The script uses only the Python standard library. It generates a unique,
throw-away user on every run and keeps the session cookie in an in-memory
CookieJar. Cookie values and request credentials are intentionally never
printed.
"""
from __future__ import annotations

import argparse
import json
import sys
import uuid
from http.cookiejar import CookieJar
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener


class SmokeFailure(AssertionError):
    """An expected runtime assertion failed."""


class RuntimeSmoke:
    def __init__(self, base_url: str, timeout: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.jar = CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.jar))
        self.current_step = "initialization"

    def request(
        self,
        step: str,
        method: str,
        path: str,
        *,
        payload: object | None = None,
        expected_status: int,
    ) -> tuple[int, bytes, object]:
        self.current_step = step
        headers = {"Accept": "application/json"}
        data = None
        if payload is not None:
            data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = Request(
            self.base_url + path,
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                status = response.status
                body = response.read()
                response_headers = response.headers
        except HTTPError as error:
            status = error.code
            body = error.read()
            response_headers = error.headers
            error.close()
        except (URLError, TimeoutError, OSError) as error:
            raise SmokeFailure(
                f"{step}: request failed ({type(error).__name__})"
            ) from error

        content_type = response_headers.get("Content-Type", "")
        print(
            f"{step}: status={status} bytes={len(body)} "
            f"content_type={content_type.split(';', 1)[0] or 'none'}"
        )
        if status != expected_status:
            raise SmokeFailure(
                f"{step}: expected HTTP {expected_status}, got {status} "
                f"with {len(body)} response bytes"
            )
        return status, body, response_headers

    @staticmethod
    def json_body(step: str, body: bytes) -> object:
        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise SmokeFailure(f"{step}: response was not valid JSON") from error

    @staticmethod
    def require(condition: bool, message: str) -> None:
        if not condition:
            raise SmokeFailure(message)

    def run(self) -> None:
        suffix = uuid.uuid4().hex
        username = f"runtime_{suffix[:16]}"
        email = f"runtime_{suffix}@example.invalid"
        password = f"Runtime!{uuid.uuid4().hex}"
        ol_id = f"runtime-ol-{uuid.uuid4().hex}"

        _, api_docs_body, _ = self.request(
            "openapi_api_docs", "GET", "/api-docs", expected_status=200
        )
        api_docs = self.json_body("openapi_api_docs", api_docs_body)
        self.require(isinstance(api_docs, dict), "openapi_api_docs: expected an object")
        paths = api_docs.get("paths")
        self.require(isinstance(paths, dict) and bool(paths), "openapi_api_docs: no paths")
        self.require("/api/auth/login" in paths, "openapi_api_docs: auth path missing")
        self.require("/api/library" in paths, "openapi_api_docs: library path missing")
        print(f"openapi_paths={len(paths)}")

        self.request(
            "unauthenticated_me_before_login",
            "GET",
            "/api/users/me",
            expected_status=401,
        )
        self.request(
            "unauthenticated_library_before_login",
            "GET",
            "/api/library",
            expected_status=401,
        )

        _, register_body, _ = self.request(
            "register",
            "POST",
            "/api/auth/register",
            payload={"email": email, "username": username, "password": password},
            expected_status=201,
        )
        registered = self.json_body("register", register_body)
        self.require(isinstance(registered, dict), "register: expected an object")
        self.require(registered.get("username") == username, "register: username mismatch")
        self.require(registered.get("email") == email, "register: email mismatch")
        self.require(isinstance(registered.get("id"), int), "register: missing numeric id")

        _, login_body, _ = self.request(
            "login",
            "POST",
            "/api/auth/login",
            payload={"username": username, "password": password},
            expected_status=200,
        )
        logged_in = self.json_body("login", login_body)
        self.require(isinstance(logged_in, dict), "login: expected an object")
        self.require(logged_in.get("username") == username, "login: username mismatch")
        self.require(bool(tuple(self.jar)), "login: no session cookie was stored")
        print(f"session_cookie_count={len(tuple(self.jar))}")

        _, me_body, _ = self.request(
            "me_after_login", "GET", "/api/users/me", expected_status=200
        )
        me = self.json_body("me_after_login", me_body)
        self.require(isinstance(me, dict), "me_after_login: expected an object")
        self.require(me.get("username") == username, "me_after_login: username mismatch")
        self.require(me.get("email") == email, "me_after_login: email mismatch")

        _, added_body, _ = self.request(
            "library_add",
            "POST",
            "/api/library",
            payload={
                "olId": ol_id,
                "title": "Runtime Smoke Book",
                "author": "Disposable Runtime Test",
                "coverUrl": None,
                "pageCount": 120,
                "status": "WANT_TO_READ",
                "genre": "runtime-test",
            },
            expected_status=201,
        )
        added = self.json_body("library_add", added_body)
        self.require(isinstance(added, dict), "library_add: expected an object")
        self.require(added.get("olId") == ol_id, "library_add: olId mismatch")
        reading_list_id = added.get("readingListId")
        self.require(
            isinstance(reading_list_id, int) and reading_list_id > 0,
            "library_add: missing numeric readingListId",
        )

        _, library_body, _ = self.request(
            "library_list_after_add", "GET", "/api/library", expected_status=200
        )
        library = self.json_body("library_list_after_add", library_body)
        self.require(isinstance(library, list), "library_list_after_add: expected a list")
        matching = [
            item
            for item in library
            if isinstance(item, dict) and item.get("readingListId") == reading_list_id
        ]
        self.require(len(matching) == 1, "library_list_after_add: added entry not found")
        self.require(matching[0].get("currentPage") == 0, "library_list_after_add: initial page")
        self.require(
            matching[0].get("status") == "WANT_TO_READ",
            "library_list_after_add: initial status",
        )
        print(f"library_count_after_add={len(library)}")

        self.request(
            "library_progress_update",
            "PUT",
            f"/api/library/{reading_list_id}/progress",
            payload={"currentPage": 42},
            expected_status=200,
        )
        _, progressed_body, _ = self.request(
            "library_list_after_progress", "GET", "/api/library", expected_status=200
        )
        progressed_library = self.json_body("library_list_after_progress", progressed_body)
        self.require(
            isinstance(progressed_library, list),
            "library_list_after_progress: expected a list",
        )
        progressed = [
            item
            for item in progressed_library
            if isinstance(item, dict) and item.get("readingListId") == reading_list_id
        ]
        self.require(len(progressed) == 1, "library_list_after_progress: entry missing")
        self.require(progressed[0].get("currentPage") == 42, "library progress was not saved")
        self.require(progressed[0].get("status") == "READING", "library status was not updated")

        self.request(
            "library_remove",
            "DELETE",
            f"/api/library/{reading_list_id}",
            expected_status=204,
        )
        _, after_remove_body, _ = self.request(
            "library_list_after_remove", "GET", "/api/library", expected_status=200
        )
        after_remove = self.json_body("library_list_after_remove", after_remove_body)
        self.require(isinstance(after_remove, list), "library_list_after_remove: expected a list")
        self.require(
            not any(
                isinstance(item, dict) and item.get("readingListId") == reading_list_id
                for item in after_remove
            ),
            "library_list_after_remove: entry still present",
        )

        self.request("logout", "POST", "/api/auth/logout", payload={}, expected_status=204)
        self.request("unauthenticated_me_after_logout", "GET", "/api/users/me", expected_status=401)
        self.request(
            "unauthenticated_library_after_logout",
            "GET",
            "/api/library",
            expected_status=401,
        )
        print("RESULT PASS")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url", default="http://127.0.0.1:10032", help="backend base URL"
    )
    parser.add_argument("--timeout", type=float, default=10.0, help="per-request timeout")
    args = parser.parse_args()
    smoke = RuntimeSmoke(args.base_url, args.timeout)
    try:
        smoke.run()
    except SmokeFailure as error:
        print(f"RESULT FAIL step={smoke.current_step}: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

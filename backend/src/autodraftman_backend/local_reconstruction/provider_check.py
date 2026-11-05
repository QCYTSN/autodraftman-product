"""Check configured model identifiers without creating a generation request."""

import asyncio

import httpx


async def model_problems(config, credentials):
    models = {}
    for stage in config["stages"].values():
        endpoint = stage["endpoint"]
        url = endpoint.rsplit("/", 1)[0] + "/models"
        if endpoint.endswith("/chat/completions"):
            url = endpoint.removesuffix("/chat/completions") + "/models"
        models.setdefault((url, stage["key_env"]), set()).add(stage["model"])

    async def check(url, key_name, expected):
        if not credentials.get(key_name):
            return []  # Credential presence is reported by the local readiness check.
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    url, headers={"Authorization": "Bearer " + credentials[key_name]}
                )
                response.raise_for_status()
                available = {item["id"] for item in response.json()["data"]}
            # Official compatibility aliases are accepted although /models omits them.
            if url == "https://api.deepseek.com/models" and "deepseek-flash" in available:
                available.update(("deepseek-v4-flash", "deepseek-v4-flash-vision-exp"))
            return ["model_unavailable:" + model for model in sorted(expected - available)]
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return ["model_availability_unconfirmed"]

    groups = await asyncio.gather(*(check(url, key, names) for (url, key), names in models.items()))
    return [problem for group in groups for problem in group]

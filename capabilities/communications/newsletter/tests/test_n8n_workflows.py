"""DP-033 S4: the two Brevo n8n workflows, as files, answer their fixtures on the Brevo twin, and answer exactly what
the capability's reference (vendors/brevo.py through n8n_reference) answers.

A small runner walks each workflow.json the way n8n does for the node types it uses: webhook, code (run in Node.js
with $input, $json and $('<node>')), if, switch, httpRequest (to the twin, the sendInBlueApi credential as the
`api-key` header, the error output on HTTP >= 400) and respondToWebhook. Anything else is refused, so the files
cannot lean on behaviour the runner does not model. Verify on the real instance with the S4 probe."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import types
from pathlib import Path

import pytest
import yaml

HERE = Path(__file__).resolve().parent
N8N = HERE.parent / "integrations" / "n8n"
# The capability's reference, the vendor adapter and the Brevo twin live in FRACTEDGE-platform, not in this repo.
# Point FRACTEDGE_PLATFORM at a checkout of it (default ~/fractedge); without one these tests are skipped.
REPO = Path(os.environ.get("FRACTEDGE_PLATFORM", Path.home() / "fractedge"))
if not (REPO / "factory/twins/brevo.py").exists():
    pytest.skip("needs a FRACTEDGE-platform checkout (set FRACTEDGE_PLATFORM)", allow_module_level=True)
CAP = REPO / "capabilities/communications/newsletter"
sys.path[:0] = [str(CAP / "orchestration/windmill"), str(CAP / "integrations"), str(REPO)]
sys.modules.setdefault("wmill", types.ModuleType("wmill"))

from factory.twins.brevo import HOST, BrevoTwin  # noqa: E402
from factory.twins.http import TwinTransport  # noqa: E402
from n8n.n8n_reference import NewsletterIntegration, tenant_config  # noqa: E402
from n8n.vendors.brevo import Brevo, BrevoConfig  # noqa: E402

WORKFLOWS = ["automation-worker-newsletter-subscribe", "automation-worker-newsletter-broadcast"]
JS = """
const ctx = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const item = (j) => ({ json: j });
const $input = { first: () => item(ctx.input), all: () => [item(ctx.input)], item: item(ctx.input) };
const $json = ctx.input;
const $ = (n) => ({ isExecuted: n in ctx.nodes, first: () => item(ctx.nodes[n]), item: item(ctx.nodes[n]) });
const out = (function () { %s })();
process.stdout.write(JSON.stringify(out === undefined ? null : out));
"""


def js(body: str, data: dict, nodes: dict):
    r = subprocess.run(["node", "-e", JS % body], input=json.dumps({"input": data, "nodes": nodes}),
                       capture_output=True, text=True, timeout=30)
    if r.returncode:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


def expr(value, data: dict, nodes: dict):
    """An n8n parameter: '={{ x }}' is JavaScript, '=a{{ x }}b' a template, anything else a literal."""
    if not isinstance(value, str) or not value.startswith("="):
        return value
    whole = re.fullmatch(r"=\{\{(.*)\}\}", value, re.S)
    if whole:
        return js(f"return ({whole.group(1)});", data, nodes)
    template = re.sub(r"\{\{(.*?)\}\}", lambda m: "${" + m.group(1) + "}", value[1:].replace("`", "\\`"))
    return js(f"return `{template}`;", data, nodes)


class Run:
    def __init__(self, workflow: dict, twin: BrevoTwin, config: dict):
        self.wf, self.twin = workflow, twin
        self.nodes = {n["name"]: n for n in workflow["nodes"]}
        for n in self.nodes.values():                      # the twin's config replaces the file's unset values
            if n["type"] == "n8n-nodes-base.code":
                code = n["parameters"]["jsCode"]
                for k, v in config.items():
                    code = code.replace(f"{k}: null,", f"{k}: {json.dumps(v)},")
                n["parameters"]["jsCode"] = code
        self.vendor = TwinTransport({HOST: twin})
        self.key = twin.key                                # the n8n credential, fixed when the run is set up
        self.seen: dict[str, dict] = {}

    def call(self, trigger: str, headers: dict, body: dict) -> dict:
        name, data = trigger, {"headers": {k.lower(): v for k, v in headers.items()}, "body": body}
        for _ in range(50):
            node = self.nodes[name]
            out, data = self.step(node, data)
            self.seen[name] = data
            if node["type"] == "n8n-nodes-base.respondToWebhook":
                return data
            targets = self.wf["connections"].get(name, {}).get("main", [])
            assert out < len(targets) and targets[out], f"{name}: output {out} goes nowhere"
            name = targets[out][0]["node"]
        raise AssertionError("no answer after 50 nodes")

    def step(self, node: dict, data: dict) -> tuple[int, dict]:
        t, p = node["type"], node["parameters"]
        if t == "n8n-nodes-base.webhook":
            return 0, data
        if t == "n8n-nodes-base.code":
            [first, *_] = js(p["jsCode"], data, self.seen)
            return 0, first["json"]
        if t == "n8n-nodes-base.if":
            [c] = p["conditions"]["conditions"]
            return (0 if expr(c["leftValue"], data, self.seen) is True else 1), data
        if t == "n8n-nodes-base.switch":
            for i, rule in enumerate(p["rules"]["values"]):
                [c] = rule["conditions"]["conditions"]
                if expr(c["leftValue"], data, self.seen) == c["rightValue"]:
                    return i, data
            raise AssertionError(f"{node['name']}: no rule matched")
        if t == "n8n-nodes-base.httpRequest":
            assert p["authentication"] == "predefinedCredentialType" and p["nodeCredentialType"] == "sendInBlueApi"
            params = {q["name"]: q["value"] for q in p.get("queryParameters", {}).get("parameters", [])}
            body = json.loads(expr(p["jsonBody"], data, self.seen)) if p.get("sendBody") else None
            r = self.vendor.request(p["method"], expr(p["url"], data, self.seen), params=params, json=body,
                                    headers={"api-key": self.key})
            if r.status_code >= 400:
                assert node.get("onError") == "continueErrorOutput", f"{node['name']} has no error output"
                return 1, {"error": {"message": f"{r.status_code} {r.content[:200]!r}"}}
            return 0, (r.json() if r.content else {})
        if t == "n8n-nodes-base.respondToWebhook":
            return 0, json.loads(expr(p["responseBody"], data, self.seen))
        raise AssertionError(f"node type {t} is not modelled by the runner")


def world(fixture: dict):
    twin = BrevoTwin()
    twin.add_list(2, "automation-worker-subscribers")
    twin.add_doi_template(fixture["twin_config"]["doi_template_id"])
    for email in fixture.get("given_confirmed", []):
        twin.contacts[email] = {"listIds": {2}, "blacklisted": False, "attributes": {}}
    return twin


def load(stem: str):
    wf = json.loads((N8N / f"{stem}.workflow.json").read_text())
    return wf, yaml.safe_load((N8N / f"{stem}.contract.yaml").read_text()), json.loads((N8N / f"{stem}.fixture.json").read_text())


def cases(stem: str):
    fixture = load(stem)[2]
    return [c["name"] for c in fixture["cases"]]


def resolve(body, fixture):
    return {k: (fixture["post"] if v == "$post" else v) for k, v in body.items()}


@pytest.mark.parametrize("stem", WORKFLOWS)
def test_workflow_matches_its_contract_and_the_binding(stem):
    wf, contract, _ = load(stem)
    assert wf["name"] == contract["workflow"]
    hooks = {n["name"]: n for n in wf["nodes"] if n["type"] == "n8n-nodes-base.webhook"}
    assert hooks["Capability call"]["parameters"]["path"] == contract["triggers"]["capability"]["path"]
    assert hooks["Capability call"]["parameters"]["authentication"] == "headerAuth"
    assert hooks["Capability call"]["parameters"]["path"].endswith("/" + contract["operation"])
    vendor = tenant_config("automation-worker")["vendor_config"]
    code = next(n for n in wf["nodes"] if n["name"] == "Check request")["parameters"]["jsCode"]
    assert f"list_id: {vendor['list_id']}," in code and f"redirect_url: '{vendor['redirect_url']}'," in code
    assert contract["operation"] in {op for b in tenant_config("automation-worker")["bindings"]
                                     for op in b["implemented_operations"]}
    for n in wf["nodes"]:
        if n["type"] == "n8n-nodes-base.httpRequest":
            assert n["credentials"] == {"sendInBlueApi": {"id": "r4izHGECKFVMFYeX", "name": "Brevo account"}}
            assert n["parameters"]["url"].lstrip("=").startswith("https://api.brevo.com/v3/")


def test_unset_config_is_refused_not_sent():
    wf, _, fixture = load("automation-worker-newsletter-subscribe")
    twin = world(fixture)
    answer = Run(wf, twin, {}).call("Capability call", {"X-Tenant": "automation-worker"}, {"email": "a@example.com"})
    assert answer == {"status": "failed", "error": "doi_template_id is not configured", "retryable": False}
    assert twin.pending == {}


@pytest.mark.parametrize("name", cases("automation-worker-newsletter-subscribe"))
def test_subscribe_fixture_on_the_twin(name):
    wf, _, fixture = load("automation-worker-newsletter-subscribe")
    case = next(c for c in fixture["cases"] if c["name"] == name)
    twin = world(fixture)
    answer = Run(wf, twin, fixture["twin_config"]).call(case["trigger"], case["request"]["headers"], case["request"]["body"])
    assert answer == case["expect"]["answer"]
    assert sorted(twin.pending) == case["expect"]["pending"]
    assert twin.on_list(2) == case["expect"].get("on_list", [])
    if answer["status"] == "ok" and case["trigger"] == "Capability call":       # the same answer as the reference
        assert reference(fixture, world(fixture), "audience.subscribe", case["request"]["body"]) == answer


def test_broadcast_fixture_on_the_twin_in_order():
    wf, _, fixture = load("automation-worker-newsletter-broadcast")
    twin, ref_twin = world(fixture), world(fixture)
    run = Run(wf, twin, fixture["twin_config"])
    for case in fixture["cases"]:
        body = resolve(case["request"]["body"], fixture)
        answer = run.call(case["trigger"], case["request"]["headers"], body)
        assert answer == case["expect"]["answer"], case["name"]
        assert len(twin.campaigns) == case["expect"]["campaigns"], case["name"]
        sent = sorted(m["to"] for m in twin.sent if m["kind"] == "campaign")
        assert sent == case["expect"].get("sent_to", sent), case["name"]
        if answer["status"] == "ok":
            assert reference(fixture, ref_twin, "campaign.send_broadcast", body) == answer, case["name"]
    [campaign] = twin.campaigns.values()
    assert (campaign["name"], campaign["subject"]) == ("post:what-is-an-agentic-website", fixture["post"]["title"])
    assert campaign["sender"] == {"name": "Automation Worker", "email": "hello@automationworker.io"}


def test_broadcast_sends_a_draft_left_by_a_failed_send():
    wf, _, fixture = load("automation-worker-newsletter-broadcast")
    twin = world(fixture)
    twin.handle("POST", "/v3/emailCampaigns", {}, {"name": "post:what-is-an-agentic-website", "subject": "x",
                "htmlContent": "<p>x</p>", "sender": {"email": "hello@automationworker.io"},
                "recipients": {"listIds": [2]}}, None, {"api-key": twin.key})
    answer = Run(wf, twin, fixture["twin_config"]).call("Capability call", {"X-Tenant": "automation-worker"},
                                                        {"post": fixture["post"]})
    assert answer == {"status": "ok", "data": {"campaign_id": "1"}} and twin.campaigns[1]["status"] == "sent"


def test_a_brevo_failure_is_reported_retryable():
    wf, _, fixture = load("automation-worker-newsletter-subscribe")
    twin = world(fixture)
    run = Run(wf, twin, fixture["twin_config"])
    twin.key = "rotated"                                       # n8n's credential no longer matches: Brevo says 401
    answer = run.call("Capability call", {"X-Tenant": "automation-worker"},
                                                        {"email": "a@example.com"})
    assert answer["status"] == "failed" and answer["retryable"] is True and answer["error"].startswith("Brevo: 401")


def reference(fixture: dict, twin: BrevoTwin, operation: str, body: dict) -> dict:
    config = BrevoConfig(list_id=2, doi_template_id=fixture["twin_config"]["doi_template_id"],
                         redirect_url=tenant_config("automation-worker")["vendor_config"]["redirect_url"],
                         from_name="Automation Worker", from_email=fixture["twin_config"]["from_email"])
    n8n = NewsletterIntegration("automation-worker", "s", brevo=Brevo(TwinTransport({HOST: twin}), twin.key, config))
    return n8n.handle("POST", f"/webhook/newsletter/automation-worker/{operation}", {}, body, None,
                      {"Authorization": "Bearer s", "X-Tenant": "automation-worker"}).json()

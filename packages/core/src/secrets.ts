export interface SecretsScanHit {
  pattern: string;
  match: string;
  index: number;
}

export interface SecretsScanOutcome {
  ok: boolean;
  hits: SecretsScanHit[];
}

/** Basic patterns: API keys, sk-, bearer tokens, .env-style secrets */
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "sk_live_or_test", re: /\bsk-(?:live|test)-[A-Za-z0-9]{16,}\b/g },
  { name: "openai_sk", re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: "github_pat", re: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { name: "github_fine_grained", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "bearer_header", re: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  {
    name: "env_assignment",
    re: /(?:^|[\s;])(?:API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|PRIVATE[_-]?KEY|PASSWORD|DATABASE_URL)\s*=\s*["']?[^\s"']{8,}/gim,
  },
  {
    name: "pem_private_key",
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
];

function redact(s: string): string {
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}…${s.slice(-2)}`;
}

/**
 * Scan text for likely secrets. Fail-closed for write paths.
 */
export function secretsScan(text: string): SecretsScanOutcome {
  const hits: SecretsScanHit[] = [];
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits.push({
        pattern: name,
        match: redact(m[0].trim()),
        index: m.index,
      });
      // avoid zero-length infinite loops
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return { ok: hits.length === 0, hits };
}

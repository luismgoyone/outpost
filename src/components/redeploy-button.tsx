import { redeployAction } from "@/app/(owner)/write-actions";
import { ActionButton } from "@/components/action-button";
import type { Deployment } from "@/lib/github/deployments";
import { parseVercelLogUrl } from "@/lib/write-actions";

/** "Redeploy" for a failed Vercel production deploy, when VERCEL_TOKEN is set. */
export function RedeployButton({ repoId, deployment }: { repoId: string; deployment: Deployment }) {
  const eligible =
    !!process.env.VERCEL_TOKEN &&
    deployment.state === "failure" &&
    deployment.environmentKind === "production" &&
    !!parseVercelLogUrl(deployment.logUrl);
  if (!eligible) return null;
  return (
    <ActionButton
      action={redeployAction}
      fields={{ repoId, deploymentId: deployment.id }}
      label="Redeploy"
      pendingLabel="Redeploying…"
      ariaLabel={`Redeploy ${deployment.environment}`}
    />
  );
}

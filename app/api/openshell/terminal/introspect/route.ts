import { NextResponse } from 'next/server'
import { dockerExecInOpenShell, OPENSHELL_NAMESPACE } from '../../../../lib/openshellHost'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get('sandboxId')

    if (!sandboxId) {
      return NextResponse.json({ error: 'sandboxId is required' }, { status: 400 })
    }

    const jsonpath = `{.spec.containers[*].name}{"\n"}{.spec.containers[*].image}{"\n"}{.status.containerStatuses[*].name}{"\n"}`
    const result = await dockerExecInOpenShell(
      `kubectl -n ${OPENSHELL_NAMESPACE} get pod ${sandboxId} -o jsonpath='${jsonpath}'`
    )

    return NextResponse.json({
      ok: true,
      sandboxId,
      raw: result.stdout.trim(),
      stderr: result.stderr.trim(),
      note: 'Pod/container introspection succeeded. Use this to select the right exec target for terminal attach.'
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to introspect sandbox pod'
    }, { status: 500 })
  }
}

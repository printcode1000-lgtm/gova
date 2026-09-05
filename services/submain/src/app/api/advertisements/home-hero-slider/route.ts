import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { HomeHeroConfig } from '@asol/hero-slider-core';

import { advertisementsAdminErrorResponse, advertisementsSaveErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A home surface every visitor reads and only an operator may change.
 *
 * `admin=1` asks the operator question and can be refused; without it the read
 * is public, which is what keeps the surface renderable for a logged-out device.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { advertisements } = createSubmainRuntime();
    assertSubmainEnv();

    const url = new URL(request.url);
    if (url.searchParams.get('admin') !== '1') {
      const current = await advertisements.homeHeroSlider.getCurrent();
      return jsonResponse(request, current, 200);
    }
    const admin = await advertisements.homeHeroSlider.getAdmin({
      uid: url.searchParams.get('uid') ?? '',
      phone: url.searchParams.get('phone') ?? '',
    });
    return jsonResponse(request, admin, 200);
  } catch (error) {
    return advertisementsAdminErrorResponse(request, error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const { advertisements } = createSubmainRuntime();
    assertSubmainEnv();

    const body = await readJsonBody<{
      identity: { uid: string; phone: string };
      config: HomeHeroConfig;
      checkIntervalMinutes: number;
    }>(request);
    const saved = await advertisements.homeHeroSlider.save(
      body.identity,
      body.config,
      body.checkIntervalMinutes,
    );
    return jsonResponse(request, saved, 200);
  } catch (error) {
    return advertisementsSaveErrorResponse(request, error, 'invalidHeroSliderConfig');
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}

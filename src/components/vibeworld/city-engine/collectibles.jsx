/**
 * collectibles.js — Handles orb collection logic.
 */
import { collectNearbyOrbs as collectEngineOrbs } from "../VibeLaunchZone";

export function collectNearbyOrbs(scene, px, py, pz, orbCountRef) {
    const c = collectEngineOrbs(scene, px, py, pz);
    if (c.length > 0) {
        orbCountRef.current += c.length;
    }
}
/**
 * Version info exports for Kleptowriter project files.
 *
 * Provides version metadata for both the project manifest (.kleptowriter.json)
 * and story metadata (story/story-metadata.json).
 */

import { CURRENT_VERSION, MANIFEST_SCHEMA_VERSION, STORY_SCHEMA_VERSION } from "./version.js";

/**
 * Version info for the project manifest (.kleptowriter.json).
 */
export interface ManifestVersionInfo {
  manifest_version: number;
  kleptowriter_version: string;
}

/**
 * Version info for story metadata (story/story-metadata.json).
 */
export interface StoryMetadataVersionInfo {
  schemaVersion: number;
  kleptowriterVersion: string;
}

/**
 * Returns version info for the project manifest (.kleptowriter.json).
 */
export function getManifestVersionInfo(): ManifestVersionInfo {
  return {
    manifest_version: MANIFEST_SCHEMA_VERSION,
    kleptowriter_version: CURRENT_VERSION,
  };
}

/**
 * Returns version info for story metadata (story/story-metadata.json).
 */
export function getStoryMetadataVersionInfo(): StoryMetadataVersionInfo {
  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    kleptowriterVersion: CURRENT_VERSION,
  };
}

/**
 * Returns combined version info for both project manifest and story metadata.
 */
export function getAllVersionInfo(): {
  manifest: ManifestVersionInfo;
  storyMetadata: StoryMetadataVersionInfo;
} {
  return {
    manifest: getManifestVersionInfo(),
    storyMetadata: getStoryMetadataVersionInfo(),
  };
}

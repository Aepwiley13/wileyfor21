// Shared in-memory store for mock/dev mode.
// Both EndorsementPage and EndorsementsWallPage import from here so they
// read and write the same array within a browser session.
export const mockEndorsements = [];

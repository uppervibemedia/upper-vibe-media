import { useEffect, useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getPublishedTracks } from "@/lib/trackCache";
import { buildUserProfile, buildCommunityIndex, scoreTrackForUser, shuffleTopPersonalizedTracks } from "@/lib/feedEngine";

/**
 * usePersonalizedFeed — fetches user behavior data and builds a scored,
 * personalized track list for auto-play and world entry.
 *
 * Returns: { sortedTracks, loading, profile }
 * - sortedTracks: scored Track[] sorted by personal relevance (best first)
 * - loading: true while data is still being fetched
 * - profile: user behavior profile from feedEngine
 */
export default function usePersonalizedFeed(userId) {
  const [allTracks, setAllTracks] = useState([]);
  const [userStreams, setUserStreams] = useState([]);
  const [userFavs, setUserFavs] = useState([]);
  const [userDownloads, setUserDownloads] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [communityIdx, setCommunityIdx] = useState({});
  const [loading, setLoading] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Stagger API calls to avoid rate limits: community first, then user
    const communityFetch = () => Promise.all([
      getPublishedTracks("-created_date", 200),
      base44.entities.SongStream.list("-created_date", 500),
      base44.entities.Favorite.filter({ type: "track" }, "-created_date", 1000),
      base44.entities.Download.filter({ content_type: "track" }, "-created_date", 1000),
    ]);

    const userFetch = userId
      ? () => new Promise(resolve => setTimeout(resolve, 500)).then(() => Promise.all([
          base44.entities.SongStream.filter({ user_id: userId }, "-created_date", 300),
          base44.entities.Favorite.filter({ user_email: null, created_by_id: userId, type: "track" }, "-created_date", 200),
          base44.entities.UserDownload.filter({ user_id: userId }, "-created_date", 200),
          base44.entities.VibeCheckIn.filter({ user_id: userId }, "-check_in_date", 7),
        ]))
      : () => Promise.resolve([[], [], [], []]);

    communityFetch().then(([tracks, allStreams, allFavs, allDls]) => {
      setAllTracks(tracks);
      setCommunityIdx(buildCommunityIndex(allStreams, allFavs, allDls));
      // Stagger user-scoped calls after community data loads
      return userFetch();
    }).then((userResult) => {
      const [myStreams, myFavs, myDls, myCheckIns] = userResult || [[], [], [], []];
      setUserStreams(myStreams);
      setUserFavs(myFavs);
      setUserDownloads(myDls);
      setCheckIns(myCheckIns);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [userId]);

  const profile = useMemo(() => buildUserProfile({
    userStreams, userFavs: userFavs.map(f => ({ ...f, track_id: f.itemId || f.track_id })), userDownloads: userDownloads.map(d => ({ ...d, song_id: d.song_id || d.content_id })), checkIns, allTracks,
  }), [userStreams, userFavs, userDownloads, checkIns, allTracks]);

  const sortedTracks = useMemo(() => {
    const published = allTracks.filter(t => t.status === "published" && t.audio_url);
    const scored = published.map(t => {
      const breakdown = scoreTrackForUser(t, profile, communityIdx);
      return { ...t, _score: breakdown.total };
    });

    if (profile.isNewUser) {
      const ranked = scored.sort((a, b) => {
        const ca = communityIdx[a.id] || { plays: 0, favs: 0, dls: 0 };
        const cb = communityIdx[b.id] || { plays: 0, favs: 0, dls: 0 };
        return (cb.plays * 0.05 + cb.favs * 20 + cb.dls * 5) - (ca.plays * 0.05 + ca.favs * 20 + ca.dls * 5);
      });
      return shuffleTopPersonalizedTracks(ranked);
    }
    return shuffleTopPersonalizedTracks(scored.sort((a, b) => b._score - a._score));
  }, [allTracks, profile, communityIdx]);

  return { sortedTracks, loading, profile };
}
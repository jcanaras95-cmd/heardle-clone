import React from "react";
import Header from "./components/Header";
import Game from "./components/Game";

export default function App() {
  const [todaysSong, setTodaysSong] = React.useState(null);

  // Deezer playlist IDs
  const playlist_ids = [14779578423];
  const playlist = playlist_ids[Math.floor(Math.random() * playlist_ids.length)];

  async function getTodaysSong() {
    const options = {
      method: "GET",
      headers: {
        "content-type": "application/octet-stream",
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
        "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
      },
    };

    const url = `https://deezerdevs-deezer.p.rapidapi.com/playlist/${playlist}`;

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const text = await response.text();
        console.error("Deezer fetch failed:", response.status, text);
        return;
      }

      const result = await response.json();

      const tracks = result?.tracks?.data;
      if (!Array.isArray(tracks) || tracks.length === 0) {
        console.error("Unexpected Deezer response shape:", result);
        return;
      }

      const random_song = tracks[Math.floor(Math.random() * tracks.length)];

      // ✅ Normalize so Game doesn't need Deezer-specific fields
      const normalized = {
        title: random_song?.title ?? "",
        artist: random_song?.artist?.name ?? "",
        preview: random_song?.preview ?? "",
        cover:
          random_song?.album?.cover_medium ||
          random_song?.album?.cover ||
          random_song?.album?.cover_big ||
          "",
      };

      setTodaysSong(normalized);
    } catch (error) {
      console.error("Deezer fetch exception:", error);
    }
  }

  React.useEffect(() => {
    getTodaysSong();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Header />
      <Game todaysSong={todaysSong} />
      <footer></footer>
    </div>
  );
}

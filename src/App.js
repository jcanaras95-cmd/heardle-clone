import React from "react"
import Header from "./components/Header"
import Game from "./components/Game"

export default function App(){

    const [todaysSong, setTodaysSong] = React.useState(null)

    // '00s Hits' Playlist ID: 248297032
    // 'HITS 2023 - Today's Top Songs' Playlist ID: 9890417302
    // '2010s party hits' Playlist ID: 715215865

    var playlist_ids = [14779578423]
    var playlist = playlist_ids[Math.floor(Math.random() * playlist_ids.length)];

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

    // If RapidAPI returns 401/403/etc, this will catch it early
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
    setTodaysSong(random_song);
  } catch (error) {
    console.error("Deezer fetch exception:", error);
  }
}


    React.useEffect(() => {
        getTodaysSong()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    return (
        <div>
            <Header />
            <Game todaysSong={todaysSong} />
            <footer></footer>
        </div>
    )
}

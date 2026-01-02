import React from "react"
import Header from "./components/Header"
import Game from "./components/Game"

export default function App(){

    const [todaysSong, setTodaysSong] = React.useState([])

    // '00s Hits' Playlist ID: 248297032
    // 'HITS 2023 - Today's Top Songs' Playlist ID: 9890417302
    // '2010s party hits' Playlist ID: 715215865

    var playlist_ids = [14779578423]
    var playlist = playlist_ids[Math.floor(Math.random() * playlist_ids.length)];

    async function getTodaysSong() {

        const options = {
            method: 'GET',
            headers: {
                'content-type': 'application/octet-stream',
                'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
                'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
            }
        };

        try {
            const url = 'https://deezerdevs-deezer.p.rapidapi.com/playlist/'+playlist;

            const response = await fetch(url, options);
            const result = await response.json();
            var random_song = result.tracks.data[Math.floor(Math.random() * result.tracks.data.length)];

            if (random_song != null){
                setTodaysSong(random_song)
            }

        } catch (error) {
            console.error(error);
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

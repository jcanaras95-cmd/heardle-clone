import React from "react";
import Result from "./Result";
import skippedImg from "../assets/skipped.png";
import wrongImg from "../assets/wrong.png";

export default function Game(props) {
  const todaysSong = props.todaysSong;

  // ✅ Don't render game until we actually have a song
  if (!todaysSong) {
    return <div style={{ padding: 16 }}>Loading song...</div>;
  }

  // Support BOTH raw Deezer + normalized song shape
  const todaysTitle = (todaysSong.title_short || todaysSong.title || "").trim();
  const todaysArtist = (
    todaysSong.artist?.name || todaysSong.artist || ""
  ).trim();
  const todaysPreview = todaysSong.preview || "";
  const todaysCover =
    todaysSong.cover ||
    todaysSong.album?.cover_medium ||
    todaysSong.album?.cover ||
    todaysSong.album?.cover_big ||
    "";

  // Search state
  const [songs, setSongs] = React.useState([]); // search dropdown results
  const [query, setQuery] = React.useState("");
  const [dropdownVisible, setDropdownVisible] = React.useState(false);
  const [selectedSong, setSelectedSong] = React.useState(""); // "Title - Artist"

  // Game state
  const [songSeconds, setSongSeconds] = React.useState(1000);
  const [numSkips, setNumSkips] = React.useState(0);
  const [skipSeconds, setSkipSeconds] = React.useState(1);
  const [btnSrc, setBtnSrc] = React.useState("play_btn.png");
  const [loadSeconds, setLoadSeconds] = React.useState("00");
  const [isGameOver, setIsGameOver] = React.useState(false);
  const [isSuccessfulGuess, setIsSuccessfulGuess] = React.useState(false);

  // guesses UI
  const [guessValues, setGuessValues] = React.useState(["", "", "", "", "", ""]);
  const [guessBg, setGuessBg] = React.useState(["none", "none", "none", "none", "none", "none"]);
  const [isSkipped, setIsSkipped] = React.useState([false, false, false, false, false, false]);
  const [isWrong, setIsWrong] = React.useState([false, false, false, false, false, false]);

  // Progress bars (6 segments)
  const [filledBars, setFilledBars] = React.useState([true, false, false, false, false, false]);

  // Audio
  const audioRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  React.useEffect(() => {
    // Reset audio when today's preview changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    audioRef.current = todaysPreview ? new Audio(todaysPreview) : null;

    // cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [todaysPreview]);

  // RapidAPI Deezer config
  const options = React.useMemo(
    () => ({
      method: "GET",
      headers: {
        "content-type": "application/octet-stream",
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
        "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
      },
    }),
    []
  );

  // Debounce + AbortController
  const debounceTimerRef = React.useRef(null);
  const controllerRef = React.useRef(null);

  async function fetchSearchSongs(q, signal) {
    const apiUrl = `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(q)}`;
    const res = await fetch(apiUrl, { ...options, signal });

    if (!res.ok) {
      const text = await res.text();
      console.error("Search failed:", res.status, text);
      return [];
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];

    // de-dupe and normalize results
    const out = [];
    for (const x of data.data) {
      const title_short = x?.title_short || x?.title || "";
      const artistName = x?.artist?.name || "";
      const artistId = x?.artist?.id;

      if (!title_short || !artistName) continue;

      if (!out.some((e) => e.title_short === title_short && e.artist_id === artistId)) {
        out.push({ title_short, artist: artistName, artist_id: artistId });
      }
    }
    return out;
  }

  React.useEffect(() => {
    // clear previous debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    // abort previous request
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;

    if (!query || query.trim().length === 0) {
      setSongs([]);
      setDropdownVisible(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchSearchSongs(query.trim(), signal);
        setSongs(results);
        setDropdownVisible(results.length > 0);
      } catch (e) {
        // ignore abort errors
      }
    }, 350);

    return () => {
      controllerRef.current?.abort("cancel");
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, options]);

  function inputChange(value) {
    setQuery(value);
    setSelectedSong("");
    setDropdownVisible(true);
  }

  function chooseSong(item) {
    const text = `${item.title_short} - ${item.artist}`;
    setSelectedSong(text);
    setQuery(text);
    setDropdownVisible(false);
  }

  function stopAudio() {
    const a = audioRef.current;
    if (!a) return;

    a.pause();
    a.currentTime = 0;
    setBtnSrc("play_btn.png");
    setLoadSeconds("00");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function previewSong() {
    const a = audioRef.current;
    if (!a) return;

    // toggle pause
    if (!a.paused) {
      stopAudio();
      return;
    }

    stopAudio();

    // start timer display
    intervalRef.current = setInterval(() => {
      setLoadSeconds((prev) => {
        let secs = parseInt(prev, 10);
        if (Number.isNaN(secs)) secs = 0;
        secs += 1;

        if (secs >= songSeconds / 1000) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setBtnSrc("play_btn.png");
        }

        return secs < 10 ? `0${secs}` : `${secs}`;
      });
    }, 1000);

    const playPromise = a.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          setBtnSrc("pause_btn.png");
          setTimeout(() => {
            a.pause();
            setBtnSrc("play_btn.png");
          }, songSeconds);
        })
        .catch((err) => {
          console.log("Audio play blocked:", err);
          // If browser blocks autoplay, user must click again — that's OK.
          stopAudio();
        });
    }
  }

  function advanceTimeSettings(newNumSkips) {
    // Update playback time + skip display + bars
    const newBars = [true, false, false, false, false, false];
    for (let i = 1; i <= Math.min(newNumSkips, 5); i++) newBars[i] = true;
    setFilledBars(newBars);

    if (newNumSkips === 0) {
      setSongSeconds(1000);
      setSkipSeconds(1);
    } else if (newNumSkips === 1) {
      setSongSeconds(2000);
      setSkipSeconds(2);
    } else if (newNumSkips === 2) {
      setSongSeconds(4000);
      setSkipSeconds(3);
    } else if (newNumSkips === 3) {
      setSongSeconds(7000);
      setSkipSeconds(4);
    } else if (newNumSkips === 4) {
      setSongSeconds(11000);
      setSkipSeconds(5);
    } else if (newNumSkips === 5) {
      setSongSeconds(16000);
    }
  }

  function markGuess({ skipped, wrong, text }) {
    // write into current guess slot (numSkips)
    const idx = numSkips;

    setGuessValues((prev) => {
      const copy = [...prev];
      copy[idx] = text;
      return copy;
    });

    setGuessBg((prev) => {
      const copy = [...prev];
      copy[idx] = skipped ? skippedImg : wrong ? wrongImg : "none";
      return copy;
    });

    if (skipped) {
      setIsSkipped((prev) => {
        const copy = [...prev];
        copy[idx] = true;
        return copy;
      });
    }

    if (wrong) {
      setIsWrong((prev) => {
        const copy = [...prev];
        copy[idx] = true;
        return copy;
      });
    }
  }

  function skipSongSeconds(skipped) {
    stopAudio();

    if (skipped) {
      markGuess({ skipped: true, wrong: false, text: "SKIPPED" });
    } else {
      const typed = (selectedSong || query || "").trim();
      markGuess({ skipped: false, wrong: true, text: typed || "WRONG" });
    }

    if (numSkips === 5) {
      setIsGameOver(true);
      return;
    }

    setNumSkips((prev) => {
      const next = prev + 1;
      advanceTimeSettings(next);
      return next;
    });
  }

  function submitAnswer() {
    const typed = (selectedSong || query || "").trim();

    if (typed.length === 0) {
      skipSongSeconds(true);
      return;
    }

    const parts = typed.split("-");
    const guessTitle = (parts[0] || "").trim();
    const guessArtist = (parts[1] || "").trim();

    // Compare case-insensitive
    const ok =
      guessTitle.toLowerCase() === todaysTitle.toLowerCase() &&
      guessArtist.toLowerCase() === todaysArtist.toLowerCase();

    if (ok) {
      setIsGameOver(true);
      setIsSuccessfulGuess(true);
    } else {
      skipSongSeconds(false);
    }
  }

  function seeTodaysAnswer() {
    // mark remaining as skipped
    setIsSkipped((prev) => {
      const copy = [...prev];
      for (let i = numSkips; i < copy.length; i++) copy[i] = true;
      return copy;
    });
    setIsGameOver(true);
  }

  if (isGameOver) {
    return (
      <Result
        todaysSong={props.todaysSong}
        songSeconds={songSeconds}
        isSuccessfulGuess={isSuccessfulGuess}
        numSkips={numSkips}
        isSkipped={isSkipped}
        isWrong={isWrong}
      />
    );
  }

  return (
    <div onClick={() => setDropdownVisible(false)}>
      <div className="game-guess-title">
        {guessValues.map((val, i) => (
          <input
            key={i}
            id={`guess_title_${i}`}
            type="text"
            disabled
            value={val}
            style={{
              backgroundImage: guessBg[i] !== "none" ? `url(${guessBg[i]})` : "none",
            }}
            readOnly
          />
        ))}
      </div>

      <div className="game-main">
        <div className="outer-container">
          <div className="inner-container">
            <div className="game-time">
              {filledBars.map((filled, i) => (
                <span className="game-time-grid" key={i}>
                  <div
                    id={`time-${i + 1}`}
                    className="game-time-grid-loaded"
                    style={{ width: filled ? "100%" : "0%" }}
                  />
                </span>
              ))}
            </div>

            <div className="game-time-play">
              <p>0:{loadSeconds}</p>
              <img
                className="game-play-btn"
                src={require("../assets/" + btnSrc)}
                alt="play button"
                width="40"
                height="40"
                onClick={(e) => {
                  e.stopPropagation();
                  previewSong();
                }}
              />
              <p>0:16</p>
            </div>

            {/* Optional: show cover if you want */}
            {todaysCover ? (
              <img
                src={todaysCover}
                alt="cover"
                style={{ display: "none" }} // keep hidden if your UI doesn't use it yet
              />
            ) : null}

            <div className="game-guess-title" onClick={(e) => e.stopPropagation()}>
              <div
                id="grid-layout"
                className="grid-layout"
                style={{ visibility: dropdownVisible ? "visible" : "hidden" }}
              >
                {dropdownVisible &&
                  songs.map((s, i) => (
                    <div
                      key={`${s.title_short}-${s.artist_id}-${i}`}
                      className="grid-layout-song"
                      onClick={() => chooseSong(s)}
                      style={{ cursor: "pointer" }}
                    >
                      {s.title_short} - {s.artist}
                    </div>
                  ))}
              </div>

              <input
                id="search-input"
                type="text"
                placeholder="Know it? Search for the artist / title"
                onChange={(event) => inputChange(event.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (songs.length > 0 && query.length > 0) setDropdownVisible(true);
                }}
                value={selectedSong !== "" ? selectedSong : query}
              />
            </div>

            <div className="game-buttons">
              <button
                className="skip-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  skipSongSeconds(true);
                }}
              >
                {numSkips === 5 ? "SKIP" : `SKIP (+${skipSeconds})`}
              </button>
              <button
                className="submit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  submitAnswer();
                }}
              >
                SUBMIT
              </button>
            </div>

            <span
              className="todays-answer-btn"
              onClick={(e) => {
                e.stopPropagation();
                seeTodaysAnswer();
              }}
              style={{ cursor: "pointer" }}
            >
              See today's answer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

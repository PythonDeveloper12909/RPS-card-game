import "./Game.css";
import { useState, useEffect, useRef } from "react";
import { cleanDirtyNodes, motion } from "motion/react";

function Game() {
  const cardsdeck = Array.from({ length: 36 }, (_, i) => {
    const types = ["🪨", "📄", "✂️"];
    return {
      id: i,
      type: types[i % 3],
    };
  });

  const [cards, setCards] = useState({
    enemyhand: [],
    playerhand: [],
    deck: [],
  });

  const [playeractive, setPlayeractive] = useState(null);
  const [enemyactive, setEnemyactive] = useState(null);

  const [enemyactivate, setEnemyactivate] = useState(null);
  const [playeractivate, setPlayeractivate] = useState(null);

  const [turn, setTurn] = useState("enemy");
  const [discard, setDiscard] = useState([]);
  const [phase, setPhase] = useState("dealing");

  const [enemyscore, setEnemyscore] = useState(0);
  const [playerscore, setPlayerscore] = useState(0);

  const rendered = useRef(false);

  // ---------------- INIT ----------------
  useEffect(() => {
    if (!rendered.current) {
      const shuffle = (cards) => {
        for (let i = cards.length - 1; i >= 0; i--) {
          const r = Math.floor(Math.random() * cards.length);
          [cards[i], cards[r]] = [cards[r], cards[i]];
        }
      };

      let temp = [...cardsdeck];
      shuffle(temp);

      const enemyhand = temp.slice(0, 3);
      const playerhand = temp.slice(3, 6);
      const deck = temp.slice(6);

      setCards({ enemyhand, playerhand, deck });
      rendered.current = true;
    }
  }, []);

  // ---------------- PHASE FLOW ----------------
  useEffect(() => {
    if (phase !== "dealing") return;
    const id = setTimeout(() => setPhase("enemy_turn"), 800);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (turn !== "enemy" || phase !== "enemy_turn" || !cards.enemyhand.length)
      return;

    const id = setTimeout(() => {
      const i = Math.floor(Math.random() * 3);
      setEnemyactivate(i);
      setEnemyactive(cards.enemyhand[i]);

      setTurn("player");
      setPhase("player_turn");
    }, 800);

    return () => clearTimeout(id);
  }, [turn, phase, cards.enemyhand]);

  // ---------------- PLAYER ACTION ----------------
  const activate = (card, index) => {
    if (turn !== "player") return;

    setPlayeractivate(index);
    setPlayeractive(card);

    win_condition(card, enemyactive);

    setPhase("resolve");

    setTimeout(() => {
      setPhase("discarding");
    }, 800);
  };

  // ---------------- DISCARD + NEXT ROUND ----------------

  useEffect(() => {
    if (phase !== "discarding") return;

    const id = setTimeout(() => {
      const prevhand = [...cards.enemyhand, ...cards.playerhand];

      // Step 1: move current round to discard
      const updatedDiscard = [...discard, ...prevhand];

      let nextDeck = [...cards.deck];

      // Step 2: check if deck has enough cards for next round
      if (nextDeck.length < 6) {
        // reshuffle discard into deck
        nextDeck = [...updatedDiscard];

        // shuffle
        for (let i = nextDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nextDeck[i], nextDeck[j]] = [nextDeck[j], nextDeck[i]];
        }

        // discard is now empty (since moved to deck)
        setDiscard([]);
      } else {
        // keep discard if not reshuffling
        setDiscard(updatedDiscard);
      }

      // Step 3: deal new hands
      const nextEnemyhand = nextDeck.slice(0, 3);
      const nextPlayerhand = nextDeck.slice(3, 6);
      const remainingDeck = nextDeck.slice(6);

      setCards({
        enemyhand: nextEnemyhand,
        playerhand: nextPlayerhand,
        deck: remainingDeck,
      });

      // reset
      setEnemyactivate(null);
      setEnemyactive(null);
      setPlayeractive(null);
      setPlayeractivate(null);
      setTurn("enemy");
      setPhase("dealing");
    }, 1000);

    return () => clearTimeout(id);
  }, [phase, cards, discard]);

  // ---------------- ANIMATION ----------------
  const getX = (hand, index) => {
    if (hand === "discard") return 1415;
    if (hand === "deck") return 0;

    if (hand === "enemy") {
      if (enemyactivate === index) return 600;
      return [500, 700, 900][index];
    }
    if (phase === "reset") {
      return 0;
    }

    if (hand === "player") {
      if (playeractivate === index) return 800;
      return [500, 700, 900][index];
    }
  };

  const getY = (hand, index) => {
    if (hand === "discard") return index * 4.8;

    if (hand === "enemy") {
      if (enemyactivate === index) return 50;
      return -200;
    }
    if (phase === "reset") {
      return index * 4.8;
    }

    if (hand === "player") {
      if (playeractivate === index) return 50;
      return 325;
    }

    return index * 4.8;
  };

  const renderCard = (card, hand, index) => (
    <motion.div
      key={card.id}
      className={`deck absolute w-30 h-50 border-4 text-5xl flex items-center top-50 justify-center ${
        hand === "enemy"
          ? "bg-red-500"
          : hand === "player"
            ? "bg-blue-500"
            : "bg-green-600"
      }`}
      animate={{
        x: getX(hand, index),
        y: getY(hand, index),
      }}
      transition={{ duration: 0.5, type: "spring" }}
      onClick={() => {
        if (hand === "player") activate(card, index);
      }}
    >
      {hand === "player"
        ? card.type
        : hand === "enemy" &&
            enemyactivate === index &&
            (phase === "resolve" || phase === "discarding")
          ? card.type
          : hand === "discard"
            ? card.type
            : "⭐"}
    </motion.div>
  );

  // ---------------- GAME LOGIC ----------------
  function win_condition(p, e) {
    if (!p || !e) return;

    if (
      (p.type === "✂️" && e.type === "📄") ||
      (p.type === "🪨" && e.type === "✂️") ||
      (p.type === "📄" && e.type === "🪨")
    ) {
      setPlayerscore((s) => s + 1);
    } else if (
      (p.type === "📄" && e.type === "✂️") ||
      (p.type === "✂️" && e.type === "🪨") ||
      (p.type === "🪨" && e.type === "📄")
    ) {
      setEnemyscore((s) => s + 1);
    }
  }

  // ---------------- UI ----------------
  return (
    <div className="h-screen flex items-center relative">
      <div className="absolute top-4 left-4 text-white text-3xl">
        Enemy: {enemyscore}
      </div>

      <div className="absolute bottom-4 left-4 text-white text-3xl">
        Player: {playerscore}
      </div>

      <div className="relative w-full h-full">
        {cards.enemyhand.map((c, i) => renderCard(c, "enemy", i))}
        {cards.playerhand.map((c, i) => renderCard(c, "player", i))}
        {cards.deck.map((c, i) => renderCard(c, "deck", i))}
        {discard.map((c, i) => renderCard(c, "discard", i))}
      </div>
    </div>
  );
}

export default Game;

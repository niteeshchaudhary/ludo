import React, { useState } from "react";
import dice from "../images/die.gif";

var diceval = 1;
export default function Dice(props) {
  const ucolors = ["r", "g", "y", "b"];
  const [loadingState, setLoadingState] = useState(false);
  const rollDice = () => {
    setLoadingState(true);
    setTimeout(() => {
      setLoadingState(false);
    }, 1000);
    setTimeout(() => {
      props.move(diceval, props.turn);
    }, 1500);
  };
  function calc() {
    if (loadingState) {
      var val = Math.floor(Math.random() * 6 + 1) > 3 ? 6 : 4;
      diceval = val;
      localStorage.setItem("val", diceval);
      console.log(diceval);
      return val;
    } else {
      return diceval;
    }
  }
  function blnk() {}
  return (
    <div
      onClick={!props.disable && !loadingState ? rollDice : blnk}
      style={{
        cursor: "pointer",
        width: "10rem",
        zIndex: 5,
        height: "9rem",
        position: "relative",
      }}
    >
      {loadingState && (
        <img
          src={require("../images/" + ucolors[props.turn] + "die.gif")}
          style={{
            width: "10rem",
            height: "9rem",
            left: 0,
            position: "absolute",
          }}
        />
      )}
      <img
        src={require("../images/" + ucolors[props.turn] + calc() + ".png")}
        style={{
          width: "10rem",
          height: "9rem",
          zIndex: -1,
          left: 0,
          position: "absolute",
        }}
      />
    </div>
  );
}

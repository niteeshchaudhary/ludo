import React from "react";

export default function Tokens(props) {
  return (
    <>
      <button
        className="rtoken"
        id="red1"
        onClick={props.function}
        style={{ top: "4.8rem", left: "4.5rem" }}
      ></button>
      <button
        className="rtoken"
        id="red2"
        onClick={props.function}
        style={{ left: "10.6rem", top: "4.8rem" }}
      ></button>
      <button
        className="rtoken"
        id="red3"
        onClick={props.function}
        style={{ top: "10.3rem", left: "4.5rem" }}
      ></button>
      <button
        className="rtoken"
        id="red4"
        onClick={props.function}
        style={{ top: "10.3rem", left: "10.2rem" }}
      ></button>

      <button
        className="gtoken"
        id="green1"
        onClick={props.function}
        style={{ top: "4.4rem", left: "31.5rem" }}
      ></button>
      <button
        className="gtoken"
        id="green2"
        onClick={props.function}
        style={{ left: "37.3rem", top: "4.4rem" }}
      ></button>
      <button
        className="gtoken"
        id="green3"
        onClick={props.function}
        style={{ top: "10.3rem", left: "31.5rem" }}
      ></button>
      <button
        className="gtoken"
        id="green4"
        onClick={props.function}
        style={{ top: "10.3rem", left: "37.3rem" }}
      ></button>

      <button
        className="btoken"
        id="blue1"
        onClick={props.function}
        style={{ top: "30.5rem", left: "4.5rem" }}
      ></button>
      <button
        className="btoken"
        id="blue2"
        onClick={props.function}
        style={{ left: "10.2rem", top: "30.5rem" }}
      ></button>
      <button
        className="btoken"
        id="blue3"
        onClick={props.function}
        style={{ top: "36rem", left: "4.5rem" }}
      ></button>
      <button
        className="btoken"
        id="blue4"
        onClick={props.function}
        style={{ top: "36rem", left: "10.2rem" }}
      ></button>

      <button
        className="ytoken"
        id="yellow1"
        onClick={props.function}
        style={{ top: "30.9rem", left: "31.5rem" }}
      ></button>
      <button
        className="ytoken"
        id="yellow2"
        onClick={props.function}
        style={{ left: "37.3rem", top: "30.9rem" }}
      ></button>
      <button
        className="ytoken"
        id="yellow3"
        onClick={props.function}
        style={{ top: "37.2rem", left: "31.5rem" }}
      ></button>
      <button
        className="ytoken"
        id="yellow4"
        onClick={props.function}
        style={{ top: "37.2rem", left: "37.3rem" }}
      ></button>
    </>
  );
}

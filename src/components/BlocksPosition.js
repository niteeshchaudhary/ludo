import React from "react";
import "./Board";
export default function BlockPosition() {
  const a6 = ["", "", "", "", "", ""];
  return (
    <>
      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + index}
          key={"ot" + index}
          style={{ left: `${index * 3 + 0.4}rem`, top: "18rem" }}
        >
          {index}
        </div>
      ))}

      <div
        className="block"
        id={"ot" + 51}
        key={"ot" + 51}
        style={{ top: "20.9rem", left: `${0.4}rem` }}
      >
        51
      </div>

      {a6.map((a, index) => (
        <div
          className="block"
          id={"re" + (index + 1)}
          key={"re" + (index + 1)}
          style={{ top: "20.9rem", left: `${(index + 1) * 3 + 0.4}rem` }}
        >
          {index + 1}
        </div>
      ))}
      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (5 - index + 45)}
          key={"ot" + (5 - index + 45)}
          style={{ top: "23.8rem", left: `${index * 3 + 0.4}rem` }}
        >
          {5 - index + 45}
        </div>
      ))}

      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (index + 19)}
          key={"ot" + (index + 19)}
          style={{ left: `${index * 3 + 27.4}rem`, top: "18rem" }}
        >
          {index + 19}
        </div>
      ))}

      <div
        className="block"
        id={"ot" + 25}
        key={"ot" + 25}
        style={{ top: "20.9rem", left: `${5 * 3 + 27.4}rem` }}
      >
        {25}
      </div>

      {a6.map((a, index) => (
        <div
          className="block"
          id={"ye" + (6 - index)}
          key={"ye" + (6 - index)}
          style={{ top: "20.9rem", left: `${(index - 1) * 3 + 27.4}rem` }}
        >
          {6 - index}
        </div>
      ))}
      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (5 - index + 26)}
          key={"ot" + (5 - index + 26)}
          style={{ top: "23.8rem", left: `${index * 3 + 27.4}rem` }}
        >
          {5 - index + 26}
        </div>
      ))}
      {/******************************
       **                           **
       **        Vertical           **
       **                           **
       *******************************/}
      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (11 - index)}
          key={"ot" + (11 - index)}
          style={{ left: "18.5rem", top: `${index * 2.9 + 0.4}rem` }}
        >
          {11 - index}
        </div>
      ))}
      <div
        className="block"
        id={"ot" + 12}
        key={"ot" + 12}
        style={{ left: "21.4rem", top: `${+0.4}rem` }}
      >
        {12}
      </div>
      {a6.map((a, index) => (
        <div
          className="block"
          id={"gr" + (index + 1)}
          key={"gr" + (index + 1)}
          style={{ left: "21.4rem", top: `${(index + 1) * 2.9 + 0.4}rem` }}
        >
          {index + 1}
        </div>
      ))}

      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (index + 13)}
          key={"ot" + (index + 13)}
          style={{ left: "24.5rem", top: `${index * 2.9 + 0.4}rem` }}
        >
          {index + 13}
        </div>
      ))}

      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (5 - index + 39)}
          key={"ot" + (5 - index + 39)}
          style={{ left: "18.5rem", top: `${index * 2.9 + 26.8}rem` }}
        >
          {5 - index + 39}
        </div>
      ))}

      <div
        className="block"
        id={"ot" + 38}
        key={"ot" + 38}
        style={{ left: "21.4rem", top: `${5 * 2.9 + 26.8}rem` }}
      >
        {38}
      </div>

      {a6.map((a, index) => (
        <div
          className="block"
          id={"bl" + (6 - index)}
          key={"bl" + (6 - index)}
          style={{ left: "21.4rem", top: `${(index - 1) * 2.9 + 26.8}rem` }}
        >
          {6 - index}
        </div>
      ))}

      {a6.map((a, index) => (
        <div
          className="block"
          id={"ot" + (index + 32)}
          key={"ot" + (index + 32)}
          style={{ left: "24.5rem", top: `${index * 2.9 + 26.8}rem` }}
        >
          {index + 32}
        </div>
      ))}
    </>
  );
}

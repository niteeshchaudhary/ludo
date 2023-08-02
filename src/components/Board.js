import React, { useState, useEffect } from "react";
import background from "../images/background.jpg";
import BlockPosition from "./BlocksPosition";
import TokenPosition from "./TokenPosition";
import Tokens from "./Tokens";
import "./Board.css";
import Dice from "./Dice";

export default function Board() {
  const ucolors = ["red", "green", "yellow", "blue"];
  const [turn, setTurn] = useState(0);
  const [diceval, setDiceval] = useState(0);
  const [disable, setDisable] = useState(false);
  const [initials, setinitials] = useState({});
  const [current, setcurrent] = useState({});
  const color_limit = [51, 12, 25, 38];

  useEffect(() => {
    const redtokens = document.getElementsByClassName("rtokenp");
    const greentokens = document.getElementsByClassName("gtokenp");
    const yellowtokens = document.getElementsByClassName("ytokenp");
    const bluetokens = document.getElementsByClassName("btokenp");

    const redtoken = document.getElementsByClassName("rtoken");
    const greentoken = document.getElementsByClassName("gtoken");
    const yellowtoken = document.getElementsByClassName("ytoken");
    const bluetoken = document.getElementsByClassName("btoken");
    var obj = {};
    for (let i = 0; i < 4; i++) {
      console.log(i, redtokens[i]?.id);
      redtoken[i].disabled = true;
      greentoken[i].disabled = true;
      yellowtoken[i].disabled = true;
      bluetoken[i].disabled = true;
      obj = {
        ...obj,
        ["green" + (i + 1)]: [
          greentokens[i]?.style?.top,
          greentokens[i]?.style?.left,
          -1,
        ],
        ["blue" + (i + 1)]: [
          bluetokens[i]?.style?.top,
          bluetokens[i]?.style?.left,
          -1,
        ],
        ["yellow" + (i + 1)]: [
          yellowtokens[i]?.style?.top,
          yellowtokens[i]?.style?.left,
          -1,
        ],
        ["red" + (i + 1)]: [
          redtokens[i]?.style?.top,
          redtokens[i]?.style?.left,
          -1,
        ],
      };
    }
    console.log(obj);
    setinitials(obj);
    setcurrent(obj);
  }, []);

  const captureToken = (token, block) => {
    // _______ _________ _________ _________
    // | 1 9 |*| 14 22 |*| 27 35 |*| 40 48 |
    // [[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]

    var special_count = [1, 9, 14, 22, 27, 35, 40, 48];
    var nextposnum = Number(block?.id.split("t")[1]);
    if (special_count.includes(nextposnum)) {
      // console.log(
      //   "YOYOYOOYOYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYOOOOOOOOOOOOOOOOOOOOOOO"
      // );
      return null;
    }

    var tokid = token.id;
    console.log("cap", token.id, tokid.includes("red"));
    const redtokens = document.getElementsByClassName("rtokenp");
    const greentokens = document.getElementsByClassName("gtokenp");
    const yellowtokens = document.getElementsByClassName("ytokenp");
    const bluetokens = document.getElementsByClassName("btokenp");
    const redtoken = document.getElementsByClassName("rtoken");
    const greentoken = document.getElementsByClassName("gtoken");
    const yellowtoken = document.getElementsByClassName("ytoken");
    const bluetoken = document.getElementsByClassName("btoken");
    var posi = [block.style.top, block.style.left];
    posi = posi.join();
    var count = 0;
    var dt = {};
    var ind = -1;

    for (let i = 0; i < 4; i++) {
      let rdim = [redtoken[i].style.top, redtoken[i].style.left].join();
      let gdim = [greentoken[i].style.top, greentoken[i].style.left].join();
      let bdim = [bluetoken[i].style.top, bluetoken[i].style.left].join();
      let ydim = [yellowtoken[i].style.top, yellowtoken[i].style.left].join();
      if (rdim === posi && !tokid.includes("red")) {
        ind = i;
        // redtoken[i].style.top = redtokens[i].style.top;
        // redtoken[i].style.left = redtokens[i].style.left;
        console.log({
          key: "red" + (i + 1),
          val: [redtokens[i].style.top, redtokens[i].style.left, -1],
        });
        count++;
        dt = {
          key: "red" + (i + 1),
          val: [redtokens[i].style.top, redtokens[i].style.left, -1],
        };
      } else if (gdim === posi && !tokid.includes("green")) {
        // greentoken[i].style.top = greentokens[i].style.top;
        // greentoken[i].style.left = greentokens[i].style.left;
        ind = i;
        console.log({
          key: "green" + (i + 1),
          val: [greentokens[i].style.top, greentokens[i].style.left, -1],
        });
        count++;
        dt = {
          key: "green" + (i + 1),
          val: [greentokens[i].style.top, greentokens[i].style.left, -1],
        };
      } else if (bdim === posi && !tokid.includes("blue")) {
        ind = i;
        // bluetoken[i].style.top = bluetokens[i].style.top;
        // bluetoken[i].style.left = bluetokens[i].style.left;
        console.log({
          key: "blue" + (i + 1),
          val: [bluetokens[i].style.top, bluetokens[i].style.left, -1],
        });
        count++;
        dt = {
          key: "blue" + (i + 1),
          val: [bluetokens[i].style.top, bluetokens[i].style.left, -1],
        };
      } else if (ydim === posi && !tokid.includes("yellow")) {
        ind = i;
        // yellowtoken[i].style.top = yellowtokens[i].style.top;
        // yellowtoken[i].style.left = yellowtokens[i].style.left;
        console.log({
          key: "yellow" + (i + 1),
          val: [yellowtokens[i].style.top, yellowtokens[i].style.left, -1],
        });
        count++;
        dt = {
          key: "yellow" + (i + 1),
          val: [yellowtokens[i].style.top, yellowtokens[i].style.left, -1],
        };
      }
    }
    if (count == 1) {
      console.log(dt);
      if (dt.key.includes("red")) {
        redtoken[ind].style.top = redtokens[ind].style.top;
        redtoken[ind].style.left = redtokens[ind].style.left;
      } else if (dt.key.includes("green")) {
        greentoken[ind].style.top = greentokens[ind].style.top;
        greentoken[ind].style.left = greentokens[ind].style.left;
      } else if (dt.key.includes("blue")) {
        bluetoken[ind].style.top = bluetokens[ind].style.top;
        bluetoken[ind].style.left = bluetokens[ind].style.left;
      } else if (dt.key.includes("yellow")) {
        yellowtoken[ind].style.top = yellowtokens[ind].style.top;
        yellowtoken[ind].style.left = yellowtokens[ind].style.left;
      }
      return dt;
    }
    console.log(count, dt);
    return null;
  };

  const moveToken = (val, usr) => {
    const tokens = document.getElementsByClassName(ucolors[usr][0] + "token");
    console.log("turn " + turn, usr, ucolors[usr][0] + "tokenp");
    console.log(current);
    const token1 = document.getElementById(ucolors[usr] + "1");
    const token2 = document.getElementById(ucolors[usr] + "2");
    const token3 = document.getElementById(ucolors[usr] + "3");
    const token4 = document.getElementById(ucolors[usr] + "4");
    const tk = [
      [token1.style.top, token1.style.left, -1],
      [token2.style.top, token2.style.left, -1],
      [token3.style.top, token3.style.left, -1],
      [token4.style.top, token4.style.left, -1],
    ];
    if (val == 6) {
      if (
        initials[ucolors[usr] + "1"].join() === tk[0].join() &&
        initials[ucolors[usr] + "2"].join() === tk[1].join() &&
        initials[ucolors[usr] + "3"].join() === tk[2].join() &&
        initials[ucolors[usr] + "4"].join() === tk[3].join()
      ) {
        const element = document.getElementById("ot" + (usr * 13 + 1));
        token1.style.top = element.style.top;
        token1.style.left = element.style.left;
        let data = current;
        data[ucolors[usr] + "1"] = [
          element.style.top,
          element.style.left,
          "ot" + (usr * 13 + 1),
        ];
        setcurrent(data);
      } else {
        setDisable(true);
        for (let i = 0; i < tokens.length; i++) {
          tokens[i].style.cursor = "pointer";
          tokens[i].disabled = false;
          tokens[i].style.zIndex = "3";
        }
        setDiceval(val);
      }
    } else {
      if (
        initials[ucolors[turn] + "1"].join() === tk[0].join() &&
        initials[ucolors[turn] + "2"].join() === tk[1].join() &&
        initials[ucolors[turn] + "3"].join() === tk[2].join() &&
        initials[ucolors[turn] + "4"].join() === tk[3].join()
      ) {
        console.log("YOYONo");
        setTurn((turn + 1) % 4);
      } else {
        var ind = -1,
          tr = 0;
        for (let i = 0; i < 4; i++) {
          if (initials[ucolors[usr] + (i + 1)].join() === tk[i].join()) {
            tr++;
          } else {
            ind = i + 1;
          }
        }
        if (tr == 3) {
          console.log(
            "ot" + (Number(current[ucolors[usr] + ind][2].slice(2)) + val),
            usr,
            ind
          );
          var indexid = moveInside(current[ucolors[usr] + ind][2], val);
          if (indexid == null) {
            indexid =
              "ot" +
              ((Number(current[ucolors[usr] + ind][2].slice(2)) + val) % 52);
          }
          console.log(indexid);
          const element = document.getElementById(indexid);
          let data = current;
          let cap = captureToken(token1, element);
          if (cap) {
            data[cap.key] = cap.val;
          }
          token1.style.top = element.style.top;
          token1.style.left = element.style.left;

          data[ucolors[usr] + ind] = [
            element.style.top,
            element.style.left,
            indexid,
          ];
          setcurrent(data);
          setTurn((turn + 1) % 4);
        } else {
          setDisable(true);
          for (let i = 0; i < tokens.length; i++) {
            tokens[i].style.cursor = "pointer";
            tokens[i].disabled = false;
            tokens[i].style.zIndex = "3";
          }
          setDiceval(val);
        }
      }
    }
  };

  const moveInside = (blk, diceval) => {
    var curindex = -1;
    const limit = color_limit[turn];
    var nxtid = null;
    console.log(blk);
    if (blk.includes("ot")) {
      curindex = Number(blk.slice(2));
      if (curindex <= limit && limit < curindex + diceval) {
        nxtid = ucolors[turn].slice(0, 2) + (curindex + diceval - limit);
      }
    } else {
      curindex = Number(blk.slice(2));
      if (curindex + diceval <= 6) {
        nxtid = ucolors[turn].slice(0, 2) + (curindex + diceval);
      } else {
        return blk;
      }
    }
    console.log(nxtid);
    return nxtid;
  };

  const clickhandler = (e) => {
    console.log("cur", current);
    const tokens = document.getElementsByClassName(ucolors[turn][0] + "token");
    const token1 = document.getElementById(ucolors[turn] + "1");
    const token2 = document.getElementById(ucolors[turn] + "2");
    const token3 = document.getElementById(ucolors[turn] + "3");
    const token4 = document.getElementById(ucolors[turn] + "4");
    const cid = e.currentTarget.id;
    console.log("YOYO");
    const tk = [
      [token1.style.top, token1.style.left, -1],
      [token2.style.top, token2.style.left, -1],
      [token3.style.top, token3.style.left, -1],
      [token4.style.top, token4.style.left, -1],
    ];
    if (diceval == 6) {
      console.log("YOYO1");
      if (
        initials[ucolors[turn] + "1"].join() === tk[0].join() &&
        initials[ucolors[turn] + "2"].join() === tk[1].join() &&
        initials[ucolors[turn] + "3"].join() === tk[2].join() &&
        initials[ucolors[turn] + "4"].join() === tk[3].join()
      ) {
        console.log("YOYO2");
      } else {
        console.log(
          cid,
          tk[Number(cid[cid.length - 1]) - 1].join(),
          initials[cid].join()
        );
        if (
          initials[cid].join() === tk[Number(cid[cid.length - 1]) - 1].join()
        ) {
          console.log("YOYO3", cid[cid.length - 1]);
          setDisable(false);
          const element = document.getElementById("ot" + (turn * 13 + 1));
          e.currentTarget.style.top = element.style.top;
          e.currentTarget.style.left = element.style.left;
          let data = current;
          data[cid] = [
            element.style.top,
            element.style.left,
            "ot" + (turn * 13 + 1),
          ];
          setDiceval(0);
          for (let i = 0; i < tokens.length; i++) {
            tokens[i].style.cursor = "default";
            tokens[i].style.zIndex = "0";
            tokens[i].disabled = true;
          }
          setcurrent(data);
        } else {
          var indexid = moveInside(current[cid][2], diceval);
          if (indexid == null) {
            indexid =
              "ot" + ((Number(current[cid][2].slice(2)) + diceval) % 52);
          }
          const element = document.getElementById(indexid);
          setDisable(false);
          setDiceval(0);
          let data = current;
          let cap = captureToken(e.currentTarget, element);
          if (cap) {
            data[cap.key] = cap.val;
          }
          e.currentTarget.style.top = element.style.top;
          e.currentTarget.style.left = element.style.left;
          data[cid] = [element.style.top, element.style.left, indexid];
          setcurrent(data);
          for (let i = 0; i < tokens.length; i++) {
            tokens[i].style.cursor = "default";
            tokens[i].disabled = true;
            tokens[i].style.zIndex = "0";
          }
        }
      }
    } else if (
      initials[cid].join() !== tk[Number(cid[cid.length - 1]) - 1].join() &&
      diceval != 0
    ) {
      console.log("YOYO4");
      var indexid = moveInside(current[cid][2], diceval);
      if (indexid == null) {
        indexid = "ot" + ((Number(current[cid][2].slice(2)) + diceval) % 52);
      }
      setDisable(false);
      setDiceval(0);
      setTurn((turn + 1) % 4);
      console.log((current[cid][2] + diceval) % 52);
      const element = document.getElementById(indexid);
      let data = current;
      let cap = captureToken(e.currentTarget, element);
      if (cap) {
        data[cap.key] = cap.val;
      }
      e.currentTarget.style.top = element.style.top;
      e.currentTarget.style.left = element.style.left;

      data[cid] = [element.style.top, element.style.left, indexid];
      setcurrent(data);
      for (let i = 0; i < tokens.length; i++) {
        tokens[i].style.cursor = "default";
        tokens[i].disabled = true;
        tokens[i].style.zIndex = "0";
      }
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
      <div className="board">
        <img src={background} className="holder" alt="" />
        <TokenPosition />
        <BlockPosition />
        <Tokens function={clickhandler} />
      </div>
      <Dice move={moveToken} setTurn={setTurn} turn={turn} disable={disable} />
      {/* <div
        style={{
          height: "4rem",
          width: "4rem",
          backgroundColor: ucolors[turn],
        }}
      ></div> */}
    </div>
  );
}

import type {AppUI} from "./interaces/app-ui";
import {DragElement} from "./draggable";
import {UIManager} from "./ui-manager";


export function Create2DPlayerCharacter(name : string) : HTMLDivElement {
    let clientCharacterContainer = document.createElement("div");
    clientCharacterContainer.style.position = "absolute";
    clientCharacterContainer.style.top = "75%";
    clientCharacterContainer.style.left = "50%";
    clientCharacterContainer.id = "playerCharacter";
    clientCharacterContainer.classList.add("roomBound");

    let nameLabel = document.createElement("div");
    nameLabel.textContent = name;
    nameLabel.style.textAlign = "center";
    nameLabel.style.fontSize = "12px";
    nameLabel.style.color = "orange";
    nameLabel.style.fontWeight = "bold";
    clientCharacterContainer.appendChild(nameLabel);

    let clientCharacter = document.createElement("canvas");
    clientCharacter.id = "playerCharacterCanvas";
    clientCharacter.width = 30;
    clientCharacter.height = 30;
    clientCharacter.style.position = "absolute";
    clientCharacter.style.backgroundColor = "blue";
    clientCharacter.style.border = "3px solid orange";

    clientCharacterContainer.appendChild(clientCharacter);

    document.getElementById("container")!.appendChild(clientCharacterContainer);

    PlayerMovementInit();

    return clientCharacterContainer;
}

export function PlayerMovementInit() {
    const pageWidth = document.documentElement.scrollWidth;
    const pageHeight = document.documentElement.scrollHeight;

    var acc = 0.5; //  F/m = a :)
    var friction = 0.4; // Fn.f = Ft :)    ->>> m=1 asi
    var speed_x = 0;
    var speed_y = 0; //momentalni rychlost - vo kolik se posunes dalsi frame
    var max_speed = 2;
    var min_speed = -2;
    var up = 0;
    var down = 0;
    var left = 0;
    var right = 0;

    var player: HTMLElement = document.getElementById("playerCharacter")!;


    function colorRandomizer(player: any) {
        player.style.backgroundColor = "rgb(" + (Math.random() * (255)) + ", " + (Math.random() * (255)) + ", " + (Math.random() * (255)) + ")"
    }

    var playerCharCanvas: any = document.getElementById("playerCharacterCanvas")!;

    // let playerMaxX = 100;
    // let playerMaxY = 100;
    // if ( playerCharCanvas) {
    // console.log(playerCharCanvas.width, player);
    let border = 7 * parseFloat(playerCharCanvas.style.border.slice(0, 1));
    // console.log(border);
        let playerMaxX: number = 100 * (1 - (playerCharCanvas.width + border) / pageWidth);
        let playerMaxY: number = 100 * (1 -(playerCharCanvas.height + border) / pageWidth);
    // }
    // console.log(playerMaxY);


    setInterval(() => {
        speed_x = (right + left) * acc + speed_x;
        speed_y = (up + down) * acc + speed_y;

        //console.log("speed_x", speed_x);
        //console.log("speed_y", speed_y);


        // pretty messed up...
        // 60 lines of pure pain, not really dry :(
        if (speed_x > max_speed) {
            speed_x = max_speed;
        }
        if (speed_y > max_speed) {
            speed_y = max_speed;
        }
        if (speed_x < min_speed) {
            speed_x = min_speed;
        }
        if (speed_y < min_speed) {
            speed_y = min_speed;
        }


        if (Math.abs(speed_x) < friction) {
            speed_x = 0;
        } else if (speed_x > 0) {
            speed_x = speed_x - friction;
        } else {
            speed_x = speed_x + friction;
        }
        if (Math.abs(speed_y) < friction) {
            speed_y = 0;
        } else if (speed_y > 0) {
            speed_y = speed_y - friction;
        } else {
            speed_y = speed_y + friction;
        }

        let xpos = parseFloat(player!.style.left.slice(0, -1));
        let ypos = parseFloat(player!.style.top.slice(0, -1));

        //console.log("xpos before", xpos);
        //console.log("ypos before", ypos);


        xpos = xpos + speed_x / 4;
        ypos = ypos + speed_y / 2;

        //console.log("xpos after", xpos);
        //console.log("ypos after", ypos);


        let xback = Math.min(Math.max(xpos, 0), playerMaxX) + "%";
        let yback = Math.min(Math.max(ypos, 0), playerMaxY) + "%";

        player!.style.left = xback;
        player!.style.top = yback;


    }, 6)


    document.onkeyup = KeyUp;

    function KeyUp(event: any) {
        var UpKeyID = event.keyCode;

        //console.log(UpKeyID);

        switch (UpKeyID) {
            case 37: // right
                right = 0;
                break;

            case 38: //up
                up = 0;
                break;

            case 39: //left
                left = 0;
                break;

            case 40: //down
                down = 0;
                break;


            case 191: //down
                colorRandomizer(document.getElementById("player1"))
                break;
            case 84: //down
                colorRandomizer(document.getElementById("player2"))
                break;
        }
    }

    document.onkeydown = KeyDown;

    function KeyDown(event: any) {
        var DownKeyID = event.keyCode;

        switch (DownKeyID) {
            case 37: // right
                right = -1;
                break;

            case 38: //up
                up = -1;
                break;

            case 39: //left
                left = 1;
                break;

            case 40: //down
                down = 1;
                break;
        }
    }
}
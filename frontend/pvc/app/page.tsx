'use client';
import MainMenuPanel from "@/components/main-menu-panel";
import RoomsListMenu from "@/components/rooms-list-menu";
import { useEffect } from "react";
import { main } from "@/services/main";

export default function Home() {
    useEffect(() => {
        main();
    }, []);
    return (
      <div id="container">
        <table id="main-menu-table">
          <tbody>
          <tr>
            <td>
              {RoomsListMenu()}
            </td>
            <td>
              {MainMenuPanel()}
            </td>
            <td>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    );
}

export default function DistanceFalloffControl() {
    return (
        <div>
            <label htmlFor="distanceFalloff">Distance Falloff:</label>
            <input type="number" id="distanceFalloff" name="distanceFalloff" min="0" max="8000" value="10"/>
        </div>
    )
}
let TileMapInfo = null;
let Cities = null;
let Overlays = null;

get("conf/TileMapInfo.json").then(o => {
    TileMapInfo = o
}).then(() => {
    get("conf/Overlays.json").then(o => {
        Overlays = o
    }).then(() => {
        get("conf/Cities.json").then(o => {
            Cities = o
        }).then(() => {
            init()
        })
    })
})

// Entry point
function init() {
    // Initialize map
    const map = L.map('sc-map', {
        crs: L.CRS.Simple,
        center: [0, 0]
    });
    const bounds = L.latLngBounds(map.unproject([0,165168-34000], 9), map.unproject([148512-20000,0], 9));
    L.tileLayer('tiles/{z}/{x}/{y}.png', {
        maxZoom: TileMapInfo.maxZoom,
        minZoom: TileMapInfo.minZoom,
        bounds: bounds,
        tileSize: TileMapInfo.tileSize,
        reuseTiles: true,
        attribution: "Spedcord | dariowouters/ts-map"
    }).addTo(map);
    map.zoomControl.setPosition('bottomright');
    map.setMaxBounds(bounds);
    map.setView(map.unproject([128, 128], 0), 1);

    // Check query parameters
    const url = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (let i = 0; i < url.length; i++) {
        if (url[i].substring(0, 5) === "line=") {
            // Draw a line between the specified nodes
            addLine(map, url[i].substring(5))
        } else if (url[i].substring(0, 10) === "line_city=") {
            // Draw a line between to overlays
            addCityLine(map, url[i].substring(10))
        } else if (url[i].substring(0, 11) === "force_zoom=") {
            // Set zoom to a specific value and disable zooming
            map.setZoom(url[i].substring(11))
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
        } else if (url[i].substring(0, 5) === "goto=") {
            // Go to a specific coordinate
            let split = url[i].substring(5).split(";")
            map.setView(map.unproject(gameCoordinateToImageCoordinate(
                split[0],
                split[1]
            ), 8), split.length == 3 ? split[2] : map.getZoom())
        } else if (url[i].substring(0, 10) === "goto_city=") {
            // Go to a specific city
            let split = url[i].substring(10).split(";")
            let city = findCity(split[0])
            map.setView(map.unproject(gameCoordinateToImageCoordinate(
                city.X,
                city.Y
            ), 8), split.length == 2 ? split[1] : map.getZoom())
        } else if (url[i].substring(0, 6) === "helga=") {
            // Draw a Helga generated line
            let routeId = url[i].substring(6);
            get("https://helga.spedcord.xyz/v1/route/"+routeId).then(value => {
                let coords = value["coordinates"];
                const nodes = [];

                for (let i = 0; i < coords.length; i++) {
                    const item = coords[i]
                    nodes.push(map.unproject(gameCoordinateToImageCoordinate(
                        item["x"],
                        item["z"]
                    ), 8))
                }

                new L.Polyline(nodes, {
                    color: 'red',
                    weight: 4,
                    opacity: 0.95,
                    smoothFactor: 1
                }).addTo(map);
            })
        }
    }
}

// Add a line from one overlay to another
function addCityLine(map, lineStr) {
    let split = lineStr.split(";");
    let color = split[0];
    let fromCitySplit = split[1].split(",")
    let toCitySplit = split[2].split(",")
    let fromCity = findCity(decodeURI(fromCitySplit[0]));
    let toCity = findCity(decodeURI(toCitySplit[0]));
    let overlayFrom = findClosestOverlay(fromCity.X, fromCity.Y, fromCitySplit[1])
    let overlayTo = findClosestOverlay(toCity.X, toCity.Y, toCitySplit[1])

    // Draw line
    new L.Polyline([
        map.unproject(gameCoordinateToImageCoordinate(
            overlayFrom.X,
            overlayFrom.Y,
        ), 8),
        map.unproject(gameCoordinateToImageCoordinate(
            overlayTo.X,
            overlayTo.Y,
        ), 8)
    ], {
        color: color,
        weight: 4,
        opacity: 0.95,
        smoothFactor: 1
    }).addTo(map);

    // Place a marker at each overlay
    new L.Marker(
        map.unproject(gameCoordinateToImageCoordinate(
            overlayFrom.X,
            overlayFrom.Y,
        ), 8)
    ).addTo(map)
    new L.Marker(
        map.unproject(gameCoordinateToImageCoordinate(
            overlayTo.X,
            overlayTo.Y,
        ), 8)
    ).addTo(map)
}

// Find a city by name
function findCity(name) {
    for (let i = 0; i < Cities.length; i++) {
        const item = Cities[i]
        if(name == item.Name) {
            return item
        }
    }
    return null
}

// Find the closest overlay of a certain type to the specified coordinates
function findClosestOverlay(x, y, overlay) {
    let current = null;
    let currentDist = 999999999999;
    for (let i = 0; i < Overlays.length; i++) {
        const item = Overlays[i]
        if(overlay == item.Name) {
            let dist = Math.sqrt(Math.pow(item.X - x, 2) + Math.pow(item.Y - y, 2));
            if(dist < currentDist) {
                current = item;
                currentDist = dist;
            }
        }
    }
    return current;
}

// Add a line between a set of coordinates
function addLine(map, lineStr) {
    const nodeStrings = lineStr.split(";");
    const nodes = [];
    nodeStrings.forEach(nodeStr => {
        const coordinateSplit = nodeStr.split(",");
        const x = parseInt(coordinateSplit[0]);
        const y = parseInt(coordinateSplit[1]);
        nodes.push(map.unproject(gameCoordinateToImageCoordinate(x, y), 8))
    })

    new L.Polyline(nodes, {
        color: 'orange',
        weight: 4,
        opacity: 0.95,
        smoothFactor: 1
    }).addTo(map);
}

// Convert game coordinates to map coordinates
// https://github.com/dariowouters/ts-map/issues/16
function gameCoordinateToImageCoordinate(xx, yy) {
    const MAX = Math.pow(2, 8) * TileMapInfo.tileSize; //padding in ts-map 384px

    const xTot = TileMapInfo.x2 - TileMapInfo.x1; // Total X length
    const yTot = TileMapInfo.y2 - TileMapInfo.y1; // Total Y length

    const xRel = (xx - TileMapInfo.x1) / xTot; // The fraction where the X is (between 0 and 1, 0 being fully left, 1 being fully right)
    const yRel = (yy - TileMapInfo.y1) / yTot; // The fraction where the Y is

    return [
        xRel * MAX, // Where X actually is, so multiplied the actual width
        yRel * MAX // Where Y actually is, only Y is inverted
    ];
}

// Parse json data from a GET request
async function get(url) {
    try {
        const data = await fetch(url);
        const response = await data.json();
        return response;
    } catch (error) {
        console.log(error);
    }
    return null;
}
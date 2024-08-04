// Define base maps
const osmLayer = new ol.layer.Tile({
    visible: true,
    name: 'osm',
    source: new ol.source.OSM()
});

proj4.defs("EPSG:32643", "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs +type=crs");

ol.proj.proj4.register(proj4);
const proj32643 = ol.proj.get('EPSG:32643');
console.log(proj32643);

const googleLayer = new ol.layer.Tile({
    visible: false,
    name: 'google',
    source: new ol.source.XYZ({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: '© Google'
    })
});

// Map initialization
const map = new ol.Map({
    target: 'map',
    layers: [osmLayer, googleLayer], // Default to OSM
    view: new ol.View({
        center: [71.94926098826855, 22.673672788484318], // India center
        zoom: 7,
        projection: 'EPSG:4326'
    }),
    controls: [
        // Add additional controls here
        new ol.control.Zoom(), // Zoom in/out
        new ol.control.ZoomSlider(), // Slider for zooming
        new ol.control.Rotate(), // Rotation control
        new ol.control.ScaleLine(), // Scale line
        new ol.control.MousePosition({ // Mouse position display
            coordinateFormat: ol.coordinate.createStringXY(4),
            projection: 'EPSG:4326'
        }),
        new ol.control.FullScreen(), // Full screen toggle
        new ol.control.ZoomToExtent({
            extent: [67.55685613518656, 19.990022474182158, 77.26081564956755, 26.263745136968]
        }), // Zoom to extent
        new ol.control.OverviewMap({
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ]
        }) // Overview map
    ]
});

// Basemap switch function
function switchBasemap(basemap) {
    const layers = map.getLayers().getArray();

    layers.forEach(layer => {
        if (layer.get('name') === 'osm') {
            layer.setVisible(basemap === 'osm');
        } else if (layer.get('name') === 'google') {
            layer.setVisible(basemap === 'google');
        }
    });
}

// Define WMS layers
const wmsLayers = {
    'sanket:Total Population': new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: 'http://localhost:8080/geoserver/wms',
            params: { 'LAYERS': 'sanket:Total Population', 'TILED': true }
        }),
        visible: true,
        name: 'sanket:Total Population'
    }),
    'sanket:Male': new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: 'http://localhost:8080/geoserver/wms',
            params: { 'LAYERS': 'sanket:Male', 'TILED': true }
        }),
        visible: true,
        name: 'sanket:Male'
    }),
    'sanket:Female': new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: 'http://localhost:8080/geoserver/wms',
            params: { 'LAYERS': 'sanket:Female', 'TILED': true }
        }),
        visible: true,
        name: 'sanket:Female'
    }),
    'sanket:Total Household': new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: 'http://localhost:8080/geoserver/wms',
            params: { 'LAYERS': 'sanket:Total Household', 'TILED': true }
        }),
        visible: true,
        name: 'sanket:Total Household'
    })
};

// Add WMS layers to the map
Object.values(wmsLayers).forEach(layer => map.addLayer(layer));

// Toggle layer visibility based on checkbox
function toggleLayer(layerName, visibility) {
    if (wmsLayers[layerName]) {
        wmsLayers[layerName].setVisible(visibility);
    }
}

// Display legend
function displayLegend() {
    const legendContainer = document.getElementById('legend');
    legendContainer.innerHTML = '';

    // Loop through each WMS layer and add its legend if it is visible
    for (const [layerName, layer] of Object.entries(wmsLayers)) {
        if (layer.getVisible()) {
            const legendDiv = document.createElement('div');
            legendDiv.innerHTML = `
                <h3>${layerName.replace('sanket:', '')} Layer</h3>
                <img src='http://localhost:8080/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}' alt='${layerName} Legend'>
            `;
            legendContainer.appendChild(legendDiv);
        }
    }
}

let isFeatureInfo = false;

function showFeatureInfo() {
    isFeatureInfo = true;

    map.on('singleclick', function (evt) {
        if (!isFeatureInfo) return;

        const visibleLayers = Object.values(wmsLayers).filter(layer => layer.getVisible());
        if (visibleLayers.length === 0) {
            displayInfo('No visible layers to query.');
            isFeatureInfo = false;
            return;
        }

        visibleLayers.forEach(layer => {
            const wmsSource = layer.getSource();
            const url = wmsSource.getFeatureInfoUrl(
                evt.coordinate,
                map.getView().getResolution(),
                'EPSG:4326',
                { 'INFO_FORMAT': 'application/json' }
            );

            if (url) {
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        const info = document.getElementById('feature-info');
                        info.innerHTML = generateTableHtml(data.features[0].properties, layer.get('name').replace('sanket:', ''));
                    })
                    .catch(error => {
                        console.error('Error fetching feature info:', error);
                    });
            }
        });
    });
}

function generateTableHtml(properties, layerName) {
    let tableHtml = `<h3>Layer: ${layerName}</h3>`;
    tableHtml += '<table border="1" style="width:100%; border-collapse:collapse;">';
    tableHtml += '<tr><th>Key</th><th>Value</th></tr>';
    for (const [key, value] of Object.entries(properties)) {
        tableHtml += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    tableHtml += '</table>';
    return tableHtml;
}

function clearFeatureInfo() {
    isFeatureInfo = false;
    const info = document.getElementById('feature-info');
    info.innerHTML = '';
}

// Toggle Sidebar Functionality
document.getElementById('toggle-sidebar').addEventListener('click', function () {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = (sidebar.style.display === 'none') ? 'block' : 'none';
});

function applyCqlFilter() {
    document.getElementById('filter-2').style.display = 'inline';
    document.getElementById('num').style.display = 'inline';
    document.querySelector('label[for="filter-2"]').style.display = 'inline';
    document.querySelector('label[for="num"]').style.display = 'inline';
    document.getElementById('apply-filter-button').style.display = 'inline';
}

function removeCqlFilter() {
    document.getElementById('filter-2').style.display = 'none';
    document.getElementById('num').style.display = 'none';
    document.querySelector('label[for="filter-2"]').style.display = 'none';
    document.querySelector('label[for="num"]').style.display = 'none';
    document.getElementById('apply-filter-button').style.display = 'none';

    // Remove CQL filters from all layers
    Object.values(wmsLayers).forEach(layer => {
        layer.getSource().updateParams({ 'CQL_FILTER': null });
    });
}

function applyFilter() {
    const selectedCondition = document.getElementById("filter-2").value;
    const value = document.getElementById("num").value;

    if (selectedCondition === "None" || value === "") {
        alert("Please select a valid condition and enter a value.");
        return;
    }

    Object.entries(wmsLayers).forEach(([layerName, layer]) => {
        if (layer.getVisible()) {
            let filter = null;

            switch (layerName) {
                case 'sanket:Total Population':
                    filter = `POPULATION ${selectedCondition} ${value}`;
                    break;
                case 'sanket:Male':
                    filter = `MALE ${selectedCondition} ${value}`;
                    break;
                case 'sanket:Female':
                    filter = `FEMALE ${selectedCondition} ${value}`;
                    break;
                case 'sanket:Total Household':
                    filter = `HH_number ${selectedCondition} ${value}`;
                    break;
            }

            layer.getSource().updateParams({
                'CQL_FILTER': filter || null
            });
        }
    });

    alert("Filter applied");
}
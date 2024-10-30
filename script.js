let aristas = [];
let dirigidas = false;
let network;
let grafoData = {};
let nodoSeleccionado = null;

document.getElementById('agregarArista').addEventListener('click', function () {
    const nodosInput = document.getElementById('nodos').value;
    const pesoInput = document.getElementById('peso').value;
    dirigidas = document.getElementById('dirigida').checked;

    const nodos = nodosInput.split(',').map(n => n.trim());

    if (nodos.length !== 2) {
        alert('Ingrese dos nodos, usando una coma para separarlos.');
        return;
    }

    if (aristas.length >= 50) {
        alert('Ya no es posible añadir más aristas.');
        return;
    }

    aristas.push({ nodos: nodosInput, peso: parseInt(pesoInput), dirigida: dirigidas });
    document.getElementById('nodos').value = '';
    document.getElementById('peso').value = '';
    visualizarGrafo();
});

function visualizarGrafo(edgesHighlight = [], edgeColors = {}) {
    const nodes = new Set();
    const edges = [];

    aristas.forEach((arista, index) => {
        const nodos = arista.nodos.split(',').map(n => n.trim());
        nodes.add(nodos[0]);
        nodes.add(nodos[1]);

        const color = edgeColors[index] || (edgesHighlight.includes(index) ? 'purple' : '#848484'); 
        edges.push({ 
            from: nodos[0], 
            to: nodos[1], 
            label: arista.peso.toString(), 
            color: { color: color }, 
            arrows: arista.dirigida ? 'to' : '' 
        });
    });

    const data = {
        nodes: Array.from(nodes).map(n => ({ id: n, label: n })),
        edges: edges,
    };

    const container = document.getElementById('grafo');
    network = new vis.Network(container, data, {});

    network.on('selectNode', function(params) {
        nodoSeleccionado = params.nodes[0];
    });
}

document.getElementById('borrarGrafo').addEventListener('click', function () {
    aristas = []; 
    nodoSeleccionado = null; 
    if (network) {
        network.destroy();
        network = null; 
    }
    document.getElementById('resultado').innerHTML = '';
});

document.getElementById('borrar').addEventListener('click', function () {
    if (nodoSeleccionado === null) {
        alert('Seleccione un nodo para borrar.');
        return;
    }

    aristas = aristas.filter(arista => !arista.nodos.includes(nodoSeleccionado));
    nodoSeleccionado = null;
    visualizarGrafo(); 
});

function encontrarRutaOptima(origen, destino) {
    const dist = {};
    const prev = {};
    const pq = [];
    const indexMap = {}; 
    
    aristas.forEach((arista, index) => {
        const [nodo1, nodo2] = arista.nodos.split(',').map(n => n.trim());
        indexMap[`${nodo1},${nodo2}`] = index;
        indexMap[`${nodo2},${nodo1}`] = index;
    });

    const nodos = new Set();
    aristas.forEach(arista => {
        const [nodo1, nodo2] = arista.nodos.split(',').map(n => n.trim());
        nodos.add(nodo1);
        nodos.add(nodo2);
    });

    nodos.forEach(nodo => dist[nodo] = Infinity);
    dist[origen] = 0;

    pq.push({ nodo: origen, dist: 0 });

    while (pq.length > 0) {
        pq.sort((a, b) => a.dist - b.dist);
        const u = pq.shift().nodo;

        if (u === destino) break;

        aristas.forEach((arista) => {
            const [nodo1, nodo2] = arista.nodos.split(',').map(n => n.trim());
            if (u === nodo1 || u === nodo2) {
                const v = u === nodo1 ? nodo2 : nodo1;
                const alt = dist[u] + arista.peso;
                if (alt < dist[v]) {
                    dist[v] = alt;
                    prev[v] = u;
                    pq.push({ nodo: v, dist: alt });
                }
            }
        });
    }

    let ruta = [];
    let u = destino;
    while (prev[u]) {
        ruta.push(indexMap[`${prev[u]},${u}`]);
        u = prev[u];
    }

    return ruta.reverse();
}

function verificarCicloEuleriano(aristas) {
    const grafo = {};
    
    aristas.forEach((arista, index) => {
        const nodos = arista.nodos.split(',');
        const nodo1 = nodos[0].trim();
        const nodo2 = nodos[1].trim();
        
        if (!grafo[nodo1]) grafo[nodo1] = [];
        if (!grafo[nodo2]) grafo[nodo2] = [];
        
        grafo[nodo1].push({ nodo: nodo2, index });
        if (!arista.dirigida) grafo[nodo2].push({ nodo: nodo1, index });
    });

    const gradosImpares = Object.values(grafo).filter(vecinos => vecinos.length % 2 !== 0).length;

    if (gradosImpares !== 0 && gradosImpares !== 2) return false;

    const recorridoEuleriano = [];
    const visitados = new Set();

    function dfs(u) {
        for (const { nodo: v, index } of grafo[u]) {
            const edgeKey = `${u},${v},${index}`;
            const reverseEdgeKey = `${v},${u},${index}`;

            if (!visitados.has(edgeKey) && !visitados.has(reverseEdgeKey)) {
                visitados.add(edgeKey);
                visitados.add(reverseEdgeKey);
                recorridoEuleriano.push(index);

                dfs(v);
            }
        }
    }

    dfs(Object.keys(grafo)[0]);

    if (recorridoEuleriano.length === aristas.length) {
        visualizarGrafo(recorridoEuleriano, recorridoEuleriano.reduce((acc, index) => ({ ...acc, [index]: 'red' }), {}));
        return true;
    }

    return false;
}

function verificarCicloHamiltoniano(aristas) {
    const nodos = new Set();
    aristas.forEach(arista => {
        const nodosArista = arista.nodos.split(',');
        nodosArista.forEach(nodo => nodos.add(nodo.trim()));
    });

    const nodosArray = Array.from(nodos);
    const adjList = {};

    aristas.forEach(arista => {
        const [nodo1, nodo2] = arista.nodos.split(',').map(n => n.trim());

        if (!adjList[nodo1]) adjList[nodo1] = [];
        if (!adjList[nodo2]) adjList[nodo2] = [];

        adjList[nodo1].push(nodo2);
        adjList[nodo2].push(nodo1);
    });

    function backtrack(path, visited, currentNode, startNode) {
        if (path.length === nodosArray.length && adjList[currentNode].includes(startNode)) {
            path.push(startNode); 
            return true;
        }

        for (const neighbor of adjList[currentNode]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                path.push(neighbor);

                if (backtrack(path, visited, neighbor, startNode)) return true;

                path.pop();
                visited[neighbor] = false;
            }
        }
        return false;
    }

    for (const nodo of nodosArray) {
        const visited = {};
        const path = [nodo];
        visited[nodo] = true;

        if (backtrack(path, visited, nodo, nodo)) {
            const rutaIndices = path.slice(1).map((nodo, i) => {
                const prevNodo = path[i];
                return aristas.findIndex(arista => arista.nodos.includes(prevNodo) && arista.nodos.includes(nodo));
            });

            visualizarGrafo(rutaIndices, rutaIndices.reduce((acc, index) => ({ ...acc, [index]: 'blue' }), {}));
            return true;
        }
    }
    return false;
}

document.getElementById('verificarEuleriano').addEventListener('click', function () {
    const esEuleriano = verificarCicloEuleriano(aristas);
    document.getElementById('resultado').innerHTML = esEuleriano ? 'Tiene un ciclo Euleriano.' : 'No tiene un ciclo Euleriano.';
});
document.getElementById('verificarHamiltoniano').addEventListener('click', function () {
    const esHamiltoniano = verificarCicloHamiltoniano(aristas);
    document.getElementById('resultado').innerHTML = esHamiltoniano ? 'Tiene un ciclo Hamiltoniano.' : 'No tiene un ciclo Hamiltoniano.';
});

document.getElementById('verRutaOptima').addEventListener('click', function () {
    const origen = document.getElementById('origen').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const ruta = encontrarRutaOptima(origen, destino);

    visualizarGrafo(ruta, ruta.reduce((acc, index) => ({ ...acc, [index]: 'purple' }), {}));
});

<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$storageFile = __DIR__ . DIRECTORY_SEPARATOR . 'sync-storage.json';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function readStorage($storageFile) {
    if (!file_exists($storageFile)) {
        return [];
    }

    $raw = file_get_contents($storageFile);
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function writeStorage($storageFile, $data) {
    file_put_contents($storageFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'load') {
    $sessionId = $_GET['sessionId'] ?? '';
    $data = readStorage($storageFile);

    echo json_encode([
        'ok' => true,
        'state' => $data[$sessionId] ?? null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);

    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'JSON inválido'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sessionId = $payload['sessionId'] ?? '';
    $state = $payload['state'] ?? null;

    if (!$sessionId || !is_array($state)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'sessionId ou state ausente'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = readStorage($storageFile);
    $data[$sessionId] = [
        'gender' => $state['gender'] ?? null,
        'runners' => $state['runners'] ?? [],
        'startTime' => $state['startTime'] ?? null,
        'running' => (bool)($state['running'] ?? false),
        'finished' => (bool)($state['finished'] ?? false),
        'updatedAt' => time()
    ];

    writeStorage($storageFile, $data);

    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);

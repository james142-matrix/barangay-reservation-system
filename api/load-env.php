<?php

function load_env_file(string $envFile): void
{
    if (!is_file($envFile) || !is_readable($envFile)) {
        return;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || strpos($trimmed, '#') === 0) {
            continue;
        }

        $eqPos = strpos($trimmed, '=');
        if ($eqPos === false) {
            continue;
        }

        $key = trim(substr($trimmed, 0, $eqPos));
        if ($key === '') {
            continue;
        }

        $rawValue = trim(substr($trimmed, $eqPos + 1));
        if (
            (strlen($rawValue) >= 2) &&
            (
                ($rawValue[0] === '"' && $rawValue[strlen($rawValue) - 1] === '"') ||
                ($rawValue[0] === "'" && $rawValue[strlen($rawValue) - 1] === "'")
            )
        ) {
            $rawValue = substr($rawValue, 1, -1);
        }

        if (!array_key_exists($key, $_ENV) && getenv($key) === false) {
            $_ENV[$key] = $rawValue;
            putenv($key . '=' . $rawValue);
        }
    }
}

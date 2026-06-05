#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WebServer.h>
#include "mbedtls/aes.h"
#include "mbedtls/base64.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

const char* SSID     = "decode-etudiants";
const char* PASSWORD = "learnByDoing25!";

const uint8_t KEY[16] = {'1','2','3','4','5','6','7','8','9','0','a','b','c','d','e','f'};
const uint8_t IV[16]  = {'a','b','c','d','e','f','1','2','3','4','5','6','7','8','9','0'};

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
WebServer server(80);

String decrypt(String b64input) {
  // Décode base64
  size_t decodedLen = 0;
  unsigned char decoded[128];
  mbedtls_base64_decode(decoded, sizeof(decoded), &decodedLen,
                        (const unsigned char*)b64input.c_str(), b64input.length());

  // Décrypte AES-CBC
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  mbedtls_aes_setkey_dec(&aes, KEY, 128);

  uint8_t iv_copy[16];
  memcpy(iv_copy, IV, 16);

  uint8_t output[128];
  mbedtls_aes_crypt_cbc(&aes, MBEDTLS_AES_DECRYPT, decodedLen, iv_copy, decoded, output);
  mbedtls_aes_free(&aes);

  // Retire le padding
  int padLen = output[decodedLen - 1];
  return String((char*)output).substring(0, decodedLen - padLen);
}

void handleMessage() {
  if (!server.hasArg("msg")) {
    server.send(400, "text/plain", "Parametre 'msg' manquant");
    return;
  }

  String encrypted = server.arg("msg");
  String result = decrypt(encrypted);

  Serial.println("Recu : " + result);

  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.println(result);
  display.display();

  server.send(200, "text/plain", "OK");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(7, 17);

  // Init écran EN PREMIER, avant tout le reste
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Ecran non trouve !");
    while (true);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Demarrage...");
  display.display(); // force l'affichage avant le WiFi

  delay(500); // petite pause pour que l'ecran soit stable

  display.println("Connexion WiFi...");
  display.println(SSID);
  display.display();

  WiFi.begin(SSID, PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
    display.print(".");
    display.display();
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi FAILED !");
    display.println("Verifie SSID");
    display.println("et password");
    display.display();
    Serial.println("\nEchec connexion WiFi");
    return;
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WiFi OK !");
  display.println(WiFi.localIP().toString());
  display.display();

  Serial.println("\nIP : " + WiFi.localIP().toString());

  server.on("/message", HTTP_POST, handleMessage);
  server.begin();
}

void loop() {
  server.handleClient();
}

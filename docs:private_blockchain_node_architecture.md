diff --git a/docs/private_blockchain_node_architecture.md b/docs/private_blockchain_node_architecture.md
new file mode 100644
index 0000000000000000000000000000000000000000..b8871ed84271b4ed00f817be8651ab77191fc898
--- /dev/null
+++ b/docs/private_blockchain_node_architecture.md
@@ -0,0 +1,151 @@
+# Privát blokklánc futtató node architektúra
+
+## 1. Üzleti és technikai célok
+- **Adatszuverenitás**: A vállalati adatok kontrollált környezetben maradnak, kizárólag engedélyezett node-ok férnek hozzá.
+- **Megbízhatóság**: Konszenzusmechanizmus biztosítja a tranzakciók változtathatatlanságát és auditálhatóságát.
+- **Skálázhatóság**: Rugalmas horizontális bővítés felhőalapú vagy on-premise infrastruktúrán.
+- **Biztonság**: HSM/TPM támogatott kulcskezelés, TLS + Zero Trust hálózat.
+
+## 2. Logikai architektúra
+```
++-----------------------------+        +---------------------------+
+|   Felhasználói alkalmazások |        |  Felügyeleti eszközök    |
+|  (Web/Mobile/API kliensek)  |        |  (SIEM, Grafana, Kibana) |
++---------------+-------------+        +--------------+------------+
+                |                                   |
+                v                                   v
+         +------+-----------------------------------+------+
+         |         API Gateway / Reverse Proxy (mTLS)       |
+         +------+-----------------------------------+------+
+                |                                   |
+      +---------+---------+               +---------+---------+
+      |  Hitelesítési és  |               |  Kulcs- és jogosult|
+      |  jogosultsági     |               |  ságkezelő (HSM/    |
+      |  szolgáltatás     |               |  Vault)            |
+      +---------+---------+               +---------+---------+
+                |                                   |
+                v                                   v
+         +------+-----------------------------------+------+
+         |      Privát blokklánc node (Core)               |
+         |  - Konszenzus réteg (PoA/BFT)                   |
+         |  - Tranzakció feldolgozó                       |
+         |  - Állapot adatbázis (RocksDB/LevelDB)         |
+         |  - Smart contract VM (EVM/WASM)                |
+         +------+-----------------------------------+------+
+                |                                   |
+                v                                   v
+         +------+-------------+             +-------+--------------+
+         | Replikációs / P2P  |             |  Off-chain szolgált. |
+         | hálózat            |             |  - Oracle integráció |
+         +------+-------------+             |  - Adatszinkron API  |
+                |                             +--------------------+
+                v
+        +-------+--------+
+        | Monitorozás    |
+        |  - Prometheus  |
+        |  - Loki        |
+        +----------------+
+```
+
+## 3. Fizikai réteg és környezet
+- **Node típusok**
+  - *Validator node*: Konszenzusért felel, HSM-mel, redundáns hálózattal.
+  - *Observer node*: Olvasási másolat, analitika és jelentések.
+  - *Gateway node*: Külső integrációkhoz, API-throttlinggal és DDoS védelemmel.
+- **Infrastruktúra**
+  - Felhő (Oracle Cloud / AWS / Azure) és on-premise hibrid klaszter.
+  - Kubernetes (OKE/EKS/AKS) node poolok: `validator`, `observer`, `gateway` taint/label szerint.
+  - Storage: SSD NVMe, titkosított kötet (LUKS), snapshot + távoli backup.
+  - Hálózat: Privát subnet, bastion host, Security Group / Network Security Group szabályok.
+
+## 4. Szoftver stack
+- **Operációs rendszer**: Hardeningelt Linux (Oracle Linux / Ubuntu LTS).
+- **Konténer réteg**: Docker + Kubernetes Operator a node-ok életciklusához.
+- **Blokklánc implementáció**: Hyperledger Besu / Quorum / Substrate-alap, PoA (IBFT2.0) konszenzus.
+- **Smart contract réteg**: Solidity / ink! / Rust, CI/CD static analysis (Mythril, Slither).
+- **Adatbázis**: Beágyazott RocksDB, off-chain metadata PostgreSQL/TimescaleDB.
+- **Integrációs rétegek**:
+  - Oracle Cloud Functions / API Gateway adapterek.
+  - REST/GraphQL szolgáltatás a dApp-ok számára.
+  - RAG/adatszolgáltató réteg a hibrid LLM asszisztens felé.
+
+## 5. Biztonsági kontrollok
+- **Hálózat**: mTLS, mutual auth, IP allowlist, layer-7 WAF.
+- **Kulcskezelés**: HSM/TPM, rotáció, audit log, kulcsmegosztás Shamir sémával.
+- **Titkosítás**: TLS 1.3, AES-256 at-rest, backup titkosítás GPG-vel.
+- **Jogosultságkezelés**: RBAC + ABAC, Just-In-Time hozzáférés (Privileged Access Mgmt).
+- **Megfigyelés**: SIEM integráció (Oracle Cloud Guard, Splunk), real-time riasztás.
+- **Incidenskezelés**: Runbook, automatizált izoláció, forenzikai snapshot.
+
+## 6. DevOps és üzemeltetés
+1. **CI/CD pipeline**
+   - Forráskód: Git + semantic commit policy.
+   - Build: Docker image, unit/integration tesztek (smart contract + API + node).
+   - Biztonsági vizsgálatok: SAST, DAST, fuzzing.
+   - Deploy: Helm chart / Terraform modulok környezetenként.
+2. **Konfiguráció menedzsment**
+   - HashiCorp Vault / Oracle Cloud Vault secret kezeléssel.
+   - Ansible / Pulumi a node konfigurációkhoz.
+3. **Monitoring**
+   - Prometheus exporter (node, validator, P2P).
+   - Grafana dashboard, Alertmanager, Oracle Monitoring integráció.
+4. **Backup & DR**
+   - Snapshot ütemezés, offsite tárolás.
+   - RPO/RTO megállapítás, failover plan.
+
+## 7. Adat és API séma
+- **Tranzakció objektum**
+  ```json
+  {
+    "txHash": "0x…",
+    "from": "0x…",
+    "to": "0x…",
+    "value": "1000000000000000000",
+    "payload": "0x…",
+    "timestamp": "2024-05-10T10:15:00Z",
+    "signature": "0x…",
+    "status": "committed|pending|failed"
+  }
+  ```
+- **Felhasználói jogosultság** (off-chain DB)
+  ```json
+  {
+    "userId": "uuid",
+    "role": "validator|observer|admin",
+    "permissions": ["deploy_contract", "read_metrics"],
+    "mfaEnabled": true,
+    "lastLogin": "2024-05-10T08:00:00Z"
+  }
+  ```
+- **Monitoring API**
+  - `GET /node/health` → { "status": "ok", "latencyMs": 12 }
+  - `GET /node/peers` → Peerek listája.
+  - `GET /node/metrics` → Prometheus kompatibilis metrikák.
+  - `POST /node/consent` → GDPR engedélykezelés (Privacy log).
+
+## 8. Üzembe helyezési lépések
+1. Kulcsok generálása, HSM-be importálás.
+2. Infrastrukturális erőforrások (VPC, subnet, load balancer) létrehozása IaC eszközzel.
+3. Kubernetes klaszter felhúzása, node poolok taggelése.
+4. Secret management beállítása (Vault integráció, KMS policy).
+5. Blokklánc node image build + registry feltöltés.
+6. Helm chart telepítés környezetenként (dev → staging → prod).
+7. Konszenzus konfiguráció kiosztása (validator list, enode URL-ek).
+8. Monitoring és logging stack bekötése.
+9. Integrációs API endpointok publikálása (Gateway node).
+10. Runbook és incidenskezelési folyamat tesztelése.
+
+## 9. Üzemeltetési ellenőrző lista
+- [ ] Node health check (CPU, memória, disk IO).
+- [ ] Konszenzus státusz (peer count, block height drift).
+- [ ] API válaszidő és terhelés.
+- [ ] Biztonsági logok ellenőrzése (auth, config változtatás).
+- [ ] Backup sikeresség, DR drill évente.
+- [ ] Kulcsrotációs naptár követése.
+
+## 10. Jövőbeli bővítési lehetőségek
+- Layer-2 csatornák integrációja gyors tranzakciókhoz.
+- Zero-knowledge proof (ZKP) alapú identitás modul.
+- Oracle Cloud adatfolyam hibrid RAG pipeline-hoz.
+- Automatikus skálázás validator terhelés alapján.
+- Multi-LLM alapú operátori asszisztens prediktív hibadetektálással.

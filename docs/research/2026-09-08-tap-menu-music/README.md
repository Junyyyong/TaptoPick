# 탭댄스 느낌의 경쾌한 메인 음악

## 문제와 수정 방향

기준 버전: `9c2a97c`. 사용자는 기존 대기화면 음악이 “너무 느리고 졸리다”며 탭댄스처럼 신나는 비트를 요청했다.

이전 메뉴곡 Paper Lantern Waltz는 72 BPM·3/4박자이며 타악기가 없었다. 단순 배속 대신 빠른 4박자 스윙과 짧은 발끝·뒤꿈치 타격을 연상시키는 합성 퍼커션, 밝은 피아노와 탄력 있는 베이스의 새 곡으로 교체한다. 실제 탭댄서의 발소리를 녹음한 음원은 아니다.

이번 범위는 메뉴 음원 연결과 새 음악 파일·생성/검증 도구·문서다. 게임 음악 Pick Garden, 자동재생·터치 안내, 음소거 설정, 게임 규칙·디자인은 그대로 둔다. 기존 세 곡은 삭제하거나 덮어쓰지 않고 보관한다.

## 음악 구성

| 항목 | 이전: Paper Lantern Waltz | 변경: Tap Parade |
| --- | --- | --- |
| 템포·박자 | 72 BPM, 3/4 | 136 BPM, 4/4, 62% 스윙 |
| 주된 소리 | 부드러운 기타형 리드·피아노, 타악기 없음 | 짧고 밝은 피아노·워킹 베이스·탭 퍼커션 |
| 타격음 | 없음 | 합성 발끝 183회·뒤꿈치 108회와 약한 백비트 |
| 구성 | 16마디 왈츠, 40초 | 24마디 A/B/A′, 약 42.35초 |
| 리듬 강조 | 잔잔하게 이어짐 | 8·16·24마디 후반에 피아노와 베이스가 빠지는 탭 브레이크 |

기존 곡을 빠르게 재생하는 방식이 아니라 D장조의 별도 멜로디와 반주를 만들었다. 짧은 잔향으로 타격음을 선명하게 유지하고 부드러운 포화 처리를 통해 겹친 타격음의 피크를 조절했다. 런타임 볼륨 설정은 그대로다.

- [새 탭댄스 느낌 메뉴곡 — MP3](../../../public/assets/audio/pick-tap-lobby.mp3)
- [이전 왈츠 — 비교용 MP3](../../../public/assets/audio/pick-lobby.mp3)
- [변경하지 않은 게임곡](../../../public/assets/audio/pick-garden.mp3)
- [음원 생성·재현 안내](../../../public/assets/audio/README.md)

## 화면 기록과 확인 방법

화면 디자인을 바꾼 요청이 아니므로 스크린샷만으로 음악 차이를 보여줄 수 없다. 위의 두 음원을 들어 비교하고, 아래 화면과 검증 로그는 새 메뉴곡이 기존 선택 화면에 연결되어 있는지 확인하는 자료로 사용한다. 390×844 CSS px를 780×1688 PNG로 직접 캡처했다.

![새 메뉴곡을 재생하는 선택 화면](after-autoplay-menu.png)

[차단 환경의 기존 터치 안내](after-tap-prompt.png) · [변경하지 않은 음악 설정](after-settings.png) · [이전 메뉴 화면](../2026-09-08-menu-autoplay/after-autoplay-menu.png)

## 검증

- Vitest **252개 테스트**, TypeScript 검사·Vite 프로덕션 빌드 통과.
- 자동재생 허용/차단 × 390×844·375×667·320×568의 **6개 모바일 화면 조합 모두 통과**했다. 첫 방문은 `userActivation.hasBeenActive === false` 상태에서 관찰했고, 차단 환경은 로고·안내 버튼·키 입력으로 시작했다. 기존 첫 방문 검증을 새 메타데이터와 음원 경로에 맞춰 별도 기록으로 실행했다.
- 세 게임의 진입·일시정지·재개·메뉴 복귀, 음소거와 새로고침 후 설정 보존, BGM 동시 최대 1개, 각 활성 음원 한 번 다운로드를 확인했다. 보관된 왈츠와 변주곡은 게임에서 요청하지 않았다.
- WAV·MP3 8개 신호 검증 통과. 새 MP3는 **634,474바이트**, 1,867,765프레임(약 42.35295초), peak −3.267 dBFS·RMS −17.964 dBFS다. 반복 경계 차이 0.000245/0.004285로 검사 기준 0.01 이내이며 인코딩 무음 패딩이 없다.
- 기존 세 곡 WAV·MP3·JSON 총 9개와 이전 생성기의 SHA-256이 동일함을 확인했다. 새 생성기 재실행과 MP3 재인코딩도 같은 결과를 재현했다.
- 실제 휴대폰 스피커 청음이나 “흥겹다”는 주관적 평가는 자동 검증으로 대체하지 않았다. 현재 목표는 사용자가 새 곡을 듣고 템포·탭 타격감에 대해 다시 판단할 수 있게 하는 것이다.

[브라우저 검증 코드](check.cjs) · [브라우저 결과](verification.json) · [음원 측정과 원본 보존 결과](audio-verification.json)

```sh
node scripts/generate-tap-lobby.mjs
ffmpeg -y -i public/assets/audio/pick-tap-lobby.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-tap-lobby.mp3
node scripts/verify-pick-music.mjs
NODE_PATH=/Users/scdi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node docs/research/2026-09-08-tap-menu-music/check.cjs
```

## 이전 버전 보존

이번 변경 직전은 `9c2a97c`, 전체 게임 반응·음악 체험 전은 `backup-before-game-feel-2026-09-08`이다. [복구 안내](../../EXPERIMENT-game-feel.md)를 유지한다. TaptoPick만 수정하며 TAPtoTALK 원본은 변경하지 않는다. 이 연구기록은 게임 런타임에서 불러오지 않는다.

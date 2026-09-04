# TAPtoTALK 작업 지침

## 먼저 읽을 파일

1. `README.md`
2. `docs/CUSTOMIZATION.md`
3. 작업 영역에 해당하는 파일만 읽는다.

## 활성 코드 경계

- 게임 규칙: `src/core/hangul/`
- 콘텐츠: `src/content/prompts.ts`
- 화면 흐름: `src/ui/talkApp.ts`
- 디자인: `index.html`, `src/ui/styles/talk.css`, `src/ui/styles/tokens.css`
- 미디어: `public/assets/brand/`

TAP to TEN에서 복사된 그 밖의 숫자 퍼즐 모듈은 참조 코드이며 현재 진입점에서 사용하지 않는다.
요청과 직접 관련되지 않으면 읽거나 수정하지 않는다.

## 원본 보호

Git remote `source`는 TENtoTAP 원본 참조다. fetch만 허용하며 push, force-push, 브랜치 변경을 하지 않는다.
모든 변경과 push는 `origin`에만 한다.

## 구조 규칙

- `core/hangul`은 DOM, CSS, localStorage를 참조하지 않는다.
- 문장과 밸런스 수치는 `content`에 둔다.
- 로고와 영상 경로는 `config/app.ts`에 둔다.
- UI가 한글 조합 규칙을 직접 구현하지 않는다.
- 규칙 변경에는 Vitest 테스트를 함께 추가한다.


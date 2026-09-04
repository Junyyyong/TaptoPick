# TAP to PICK 작업 지침

## 먼저 읽을 파일

1. `README.md`
2. `docs/CUSTOMIZATION.md`
3. 작업 영역에 해당하는 파일만 읽는다.

## 활성 코드 경계

- 게임 규칙: `src/core/pick/`
- 콘텐츠와 이미지: `src/content/puzzles.ts`, 루트 캐릭터 폴더
- 화면 흐름: `src/ui/talkApp.ts`
- 디자인: `index.html`, `src/ui/styles/talk.css`, `src/ui/styles/tokens.css`
- 공통 미디어: `public/assets/brand/`, `movie/`

TAPtoTALK에서 복사된 한글·숫자 게임 모듈은 참조 코드이며 현재 진입점에서 사용하지 않는다.
요청과 직접 관련되지 않으면 읽거나 수정하지 않는다.

## 원본 보호

`Junyyyong/TAPtoTALK`은 원본 참조다. push, force-push, 브랜치 변경을 절대 하지 않는다.
모든 변경과 push는 TaptoPick의 `origin`에만 한다.

## 구조 규칙

- `core/pick`은 DOM, CSS, localStorage를 참조하지 않는다.
- 캐릭터와 이미지 목록은 `content`에 둔다.
- 로고와 영상 경로는 `config/app.ts`에 둔다.
- UI가 셔플, 보드 구성, 점수 규칙을 직접 구현하지 않는다.
- 규칙 변경에는 Vitest 테스트를 함께 추가한다.

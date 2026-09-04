# 디자인과 콘텐츠 수정 경계

TAP to PICK은 TAPtoTALK의 화면 감각과 폰트를 유지하면서 이미지 게임 규칙을 독립적으로 관리합니다.

## 자주 수정할 곳

- `src/content/puzzles.ts` — 캐릭터 이름, 폴더, PNG/JPG 연결
- `src/core/pick/game.ts` — 7×7·9×9 보드 생성, 셔플, 점수 규칙
- `src/ui/talkApp.ts` — 세 게임의 화면 흐름과 문구
- `src/ui/styles/talk.css` — 목표 카드, 이미지 블록, 메모리 카드 레이아웃
- `src/ui/styles/tokens.css` — TAPtoTALK에서 이어받은 색상과 한글 폰트
- `src/config/app.ts` — 앱 이름, 시작 화면 시간, 완료 영상과 음원

## 이미지 규칙

- 각 캐릭터 폴더의 PNG는 완성 이미지로 사용합니다.
- JPG 파일은 정사각형 조각이어야 합니다.
- 파일 추가·교체 뒤에는 `npm run build`로 Vite가 모든 이미지를 포함하는지 확인합니다.
- 캐릭터 폴더를 추가하면 `src/content/puzzles.ts`의 glob 패턴과 캐릭터 목록을 함께 수정합니다.

## 의존 방향

```text
ui → content → core/pick
       ↑
     config
```

`core/pick`은 DOM, CSS, localStorage를 참조하지 않습니다. 규칙 변경에는 Vitest 테스트를 함께 추가합니다.

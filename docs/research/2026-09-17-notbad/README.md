# TRY AGAIN 공통 notbad 영상

사용자가 origin/main의 2971874에 업로드한 movie/notbad.webm, notbad.mp4, notbad.mp3를 사용한다. 세 파일은 영상 두 형식과 별도 음원 한 세트다.

PUZZLE·PORTRAIT의 생명 소진, POSITION의 시간 초과 등 won=false인 모든 결과에 notbad를 선택한다. 화면 문구 TRY AGAIN은 유지한다. 성공 시 PUZZLE·PORTRAIT의 캐릭터별 영상과 POSITION의 랜덤 영상은 변경하지 않는다. iOS는 기존 감지 방식에 따라 MP4를 사용하고 나머지는 WebM, 소리는 MP3를 사용한다. 기존 영상·음원 동기화도 유지한다.

outcomeClip 분기를 별도로 검증해 캐릭터 ID 유무와 무관하게 실패는 공통 영상, 성공은 기존 영상을 선택하도록 테스트를 추가했다. 이전 원본 영상들은 삭제하지 않았다.

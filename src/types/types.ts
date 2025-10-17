export interface RhythmQuestion {
    pattern: number[];     // 문제의 리듬 패턴
    choices: number[][];   // 선택지들의 리듬 패턴
    correctAnswer: number; // 정답 인덱스
    subdivisions: 4 | 8 | 16; // 비트 수 (메트로놈 간격 결정)
}
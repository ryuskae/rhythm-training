import React, { useState, useCallback, useEffect } from 'react';
import { RhythmQuestion } from '../types/types';
import OSMDViewer from '../components/OSMDViewer';
import './RhythmGame.css';

// 리듬 패턴을 MusicXML로 변환하는 함수
function patternToMusicXML(pattern: number[], index?: number): string {
    const divisions = 8; // 8분음표 기준
    const notes = pattern.map(duration => {
        const dur = duration * divisions;
        const type = duration === 1 ? 'quarter' : duration === 0.5 ? 'eighth' : 'half';
        return `
            <note>
                <pitch><step>C</step><octave>4</octave></pitch>
                <duration>${dur}</duration>
                <type>${type}</type>
                <stem>up</stem>
            </note>
        `;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="3.1">
        <part-list>
            <score-part id="P1">
                <part-name>${index !== undefined ? `보기 ${index + 1}` : '문제'}</part-name>
            </score-part>
        </part-list>
        <part id="P1">
            <measure number="1">
                <attributes>
                    <divisions>${divisions}</divisions>
                    <key><fifths>0</fifths></key>
                    <time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef>
                </attributes>
                ${notes}
            </measure>
        </part>
    </score-partwise>`;
}

const RhythmGame: React.FC = () => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showNextButton, setShowNextButton] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // 상수로 음표/쉼표 길이 정의
    const NOTE_VALUES = {
        WHOLE: 4,      // 온음표
        HALF: 2,       // 2분음표
        QUARTER: 1,    // 4분음표
        EIGHTH: 0.5,   // 8분음표
        SIXTEENTH: 0.25, // 16분음표
        REST_QUARTER: -1,    // 4분쉼표
        REST_EIGHTH: -0.5,   // 8분쉼표
        REST_SIXTEENTH: -0.25 // 16분쉼표
    };

    // 난이도별 리듬 문제들 (4/4박자)
    const questions: RhythmQuestion[] = [
        // 4비트 난이도 (4분음표/2분음표/온음표/4분쉼표 조합)
        {
            pattern: [2, 2], // 2분음표 2개
            choices: [
                [2, 2],           // 정답
                [1, 1, 1, 1],     // 4분음표 4개
                [4],              // 온음표
                [1, -1, 1, 1],    // 4분음표 + 4분쉼표 + 4분음표 2개
                [-1, 1, 2]        // 4분쉼표 + 4분음표 + 2분음표
            ],
            correctAnswer: 0,
            subdivisions: 4  // 4비트
        },
        {
            pattern: [1, 1, -1, 1], // 4분음표 2개 + 4분쉼표 + 4분음표
            choices: [
                [1, 1, -1, 1],    // 정답
                [1, -1, 1, 1],    // 순서 다름
                [-1, 1, 1, 1],    // 순서 다름
                [1, -1, -1, 2],   // 4분음표 + 4분쉼표 2개 + 2분음표
                [2, 2]            // 2분음표 2개
            ],
            correctAnswer: 0,
            subdivisions: 4  // 4비트
        },
        // 8비트 난이도 (8분음표/4분음표/2분음표/8분쉼표 조합)
        {
            pattern: [0.5, 0.5, 1, 0.5, 0.5, 1], // 8분음표 페어 + 4분음표 + 8분음표 페어 + 4분음표
            choices: [
                [0.5, 0.5, 1, 0.5, 0.5, 1],
                [1, 0.5, 0.5, 0.5, 0.5, 1],
                [0.5, 0.5, 0.5, 0.5, 1, 1],
                [1, 1, 0.5, 0.5, 1],
                [0.5, 1, 0.5, 1, 1]
            ],
            correctAnswer: 0,
            subdivisions: 8  // 8비트
        },
        // 16비트 난이도 (16분음표/8분음표/4분음표/16분쉼표 조합)
        {
            pattern: [0.25, 0.25, 0.5, 1, 0.25, 0.25, 0.5, 1], // 16분음표 페어 + 8분음표 + 4분음표 + 16분음표 페어 + 8분음표 + 4분음표
            choices: [
                [0.25, 0.25, 0.5, 1, 0.25, 0.25, 0.5, 1],
                [0.5, 0.25, 0.25, 1, 0.25, 0.25, 0.5, 1],
                [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 1, 1],
                [0.5, 0.5, 1, 0.25, 0.25, 0.5, 1],
                [0.25, 0.25, 1, 0.25, 0.25, 1, 1]
            ],
            correctAnswer: 0,
            subdivisions: 16  // 16비트
        }
    ];

    useEffect(() => {
        setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
    }, []);

    const playNote = useCallback(async (frequency: number, duration: number) => {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.start();

        return new Promise<void>(resolve => {
            setTimeout(() => {
                oscillator.stop();
                resolve();
            }, duration * 1000);
        });
    }, [audioContext]);

    const playRhythm = useCallback(async (pattern: number[], subdivisions: number = 4) => {
        if (isPlaying) return;
        setIsPlaying(true);

        const bpm = 100; // 조금 더 천천히
        const beatDuration = 60 / bpm;
        const subBeatDuration = beatDuration / (subdivisions / 4); // 비트 간격 계산

        try {
            // 패턴을 서브비트 단위로 변환
            const subbeats = [];
            let currentSubbeat = 0;

            // 패턴의 각 음표/쉼표를 서브비트 단위로 변환
            for (const duration of pattern) {
                const subbeatsCount = Math.abs(duration) * (subdivisions / 4);
                subbeats.push({
                    startAt: currentSubbeat,
                    duration: duration,
                    isRest: duration < 0
                });
                currentSubbeat += subbeatsCount;
            }

            // 총 서브비트 수
            const totalSubbeats = subdivisions;

            // 각 서브비트 재생
            for (let i = 0; i < totalSubbeats; i++) {
                // 메트로놈 소리 재생
                const isMainBeat = i % (subdivisions / 4) === 0;
                const metronomeFreq = isMainBeat ? 880 : 440;

                // 현재 서브비트에서 시작하는 음표 찾기
                const noteAtThisBeat = subbeats.find(note => note.startAt === i);
                
                if (noteAtThisBeat && !noteAtThisBeat.isRest) {
                    // 음표와 메트로놈을 동시에 재생
                    await Promise.all([
                        playNote(metronomeFreq, 0.03),  // 메트로놈
                        playNote(660, 0.1)              // 음표
                    ]);
                } else {
                    // 메트로놈만 재생
                    await playNote(metronomeFreq, 0.03);
                }

                // 다음 서브비트까지 대기
                await new Promise(resolve => setTimeout(resolve, subBeatDuration * 1000));
            }
        } finally {
            setIsPlaying(false);
        }
    }, [playNote, isPlaying]);

    const handleAnswerClick = (choiceIndex: number) => {
        if (isPlaying) return;
        setSelectedAnswer(choiceIndex);
        
        // 정답인 경우 1초 후 자동으로 다음 문제로 넘어감
        if (choiceIndex === currentQuestion.correctAnswer) {
            setTimeout(() => {
                handleNextQuestion();
            }, 1000);
        } else {
            setShowNextButton(true);
        }
    };

    const handleNextQuestion = () => {
        setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
        setSelectedAnswer(null);
        setShowNextButton(false);
    };

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    return (
        <div className="rhythm-game">
            <div className="question">
                <h2>문제</h2>
                <OSMDViewer musicXML={patternToMusicXML(currentQuestion.pattern)} heightHint={80} />
            </div>

            <div className="choices">
                {currentQuestion.choices.map((choice, index) => (
                    <div key={index} className="choice-item">
                        <div className="choice-content">
                            {selectedAnswer !== null && (
                                <div className="score-view">
                                    <OSMDViewer musicXML={patternToMusicXML(choice, index)} heightHint={60} />
                                </div>
                            )}
                            <div className="choice-controls">
                                <button
                                    onClick={() => playRhythm(choice)}
                                    disabled={isPlaying}
                                    className="play-button"
                                >
                                    재생
                                </button>
                                <label className={`radio-label ${
                                    selectedAnswer !== null
                                        ? index === currentQuestion.correctAnswer
                                            ? 'correct'
                                            : index === selectedAnswer && !isCorrect
                                            ? 'incorrect'
                                            : ''
                                        : ''
                                }`}>
                                    <input
                                        type="radio"
                                        name="rhythm-choice"
                                        checked={selectedAnswer === index}
                                        onChange={() => handleAnswerClick(index)}
                                        disabled={selectedAnswer !== null || isPlaying}
                                    />
                                    <span className="radio-text">보기 {index + 1}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedAnswer !== null && (
                <div className="result">
                    {isCorrect ? '정답입니다!' : '틀렸습니다. 다시 들어보세요.'}
                </div>
            )}

            {showNextButton && (
                <button 
                    className="next-button"
                    onClick={handleNextQuestion}
                    disabled={isPlaying}
                >
                    다음 문제
                </button>
            )}
        </div>
    );
};

export default RhythmGame;
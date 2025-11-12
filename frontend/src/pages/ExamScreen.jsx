import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamQuestions, submitExam } from '../services/api';

export default function ExamScreen() {
    const { subject } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const examCode = localStorage.getItem('examCode');

    useEffect(() => {
        if (!examCode) return navigate('/');
        getExamQuestions(subject, examCode)
            .then(res => {
                setQuestions(res.data.questions);
                setLoading(false);
            })
            .catch(() => {
                alert('Failed to load exam');
                navigate('/exam-select');
            });
    }, [subject, examCode, navigate]);

    const handleAnswer = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await submitExam({ exam_code: examCode, answers });
            alert('Exam submitted successfully!');
            navigate('/');
        } catch (err) {
            alert('Submission failed: ' + (err.response?.data?.error || 'Unknown error'));
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center mt-10">Loading exam...</div>;

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Exam: {subject}</h1>
            <div className="space-y-8">
                {questions.map((q) => (
                    <div key={q.id} className="border-b pb-6">
                        <p className="font-medium mb-3">{q.question_text}</p>
                        {['A', 'B', 'C', 'D'].map(opt => {
                            const optText = q[`option_${opt.toLowerCase()}`];
                            if (!optText) return null;
                            return (
                                <label key={opt} className="block mb-2">
                                    <input
                                        type="radio"
                                        name={`q${q.id}`}
                                        value={opt}
                                        checked={answers[q.id] === opt}
                                        onChange={() => handleAnswer(q.id, opt)}
                                        className="mr-2"
                                    />
                                    {opt}: {optText}
                                </label>
                            );
                        })}
                    </div>
                ))}
            </div>
            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-8 px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
                {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
        </div>
    );
}
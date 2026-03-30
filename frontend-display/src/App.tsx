import { useEffect } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import BoardDisplay from './pages/BoardDisplay'
import ActivationScreen from './pages/ActivationScreen'
import BaristaPanel from './components/BaristaPanel'
function DisplayRoot() {
    const [searchParams] = useSearchParams()
    const urlBoardId = searchParams.get('board_id') || searchParams.get('id')
    const savedBoardId = localStorage.getItem('rb_terminal_id')
    const mode = searchParams.get('mode')

    const reset = searchParams.get('reset') === 'true'

    console.log("TV Mode Detection: Resolving Root State...", { urlBoardId, savedBoardId, mode, reset })

    if (reset) {
        localStorage.removeItem('rb_terminal_id')
        return <Navigate to="/tv" replace />
    } else if (mode === 'tv') {
        return <Navigate to="/tv" replace />
    } else if (urlBoardId) {
        localStorage.setItem('rb_terminal_id', urlBoardId)
        return <BoardDisplay />
    } else if (savedBoardId) {
        return <Navigate to={`/${savedBoardId}`} replace />
    } else {
        return <ActivationScreen />
    }
}

export default function App() {
    useEffect(() => {
        // We removed body CSS overrrides for debugging to ensure they aren't hiding things
    }, [])

    console.log("Current Path:", window.location.pathname);

    return (
        <Routes>
            <Route path="/" element={<DisplayRoot />} />
            <Route path="/tv" element={<ActivationScreen />} />
            <Route path="/barista" element={<BaristaPanel boardId="2351d950-0711-4aa1-a4a5-2d9e723b9094" boardName="Dev" />} />
            <Route path="/:id" element={<BoardDisplay />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}


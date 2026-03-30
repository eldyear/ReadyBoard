import { motion } from 'framer-motion'

interface Props { orderNumber: number }

export default function NewReadyToast({ orderNumber }: Props) {
    return (
        <motion.div
            className="new-ready-toast"
            initial={{ x: '120%', scale: 0.8, opacity: 0 }}
            animate={{ x: 0, scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, x: '50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            #{orderNumber}
        </motion.div>
    )
}

import { defineEventHandler } from 'h3'
import { handleSessionStream } from '../../lib/session-stream'

export default defineEventHandler((event) => handleSessionStream(event, 'admin'))

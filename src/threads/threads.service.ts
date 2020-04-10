import { InjectRepository } from '@nestjs/typeorm'
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common'

import { User } from '../users/user.entity'
import { ThreadType } from './thread-type.enum'
import { Message } from '../messages/message.entity'
import { ThreadRepository } from './thread.repository'
import { UserRepository } from '../users/user.repository'
import { MessageRepository } from '../messages/message.repository'
import { MessageType } from '../messages/message-type.enum'

@Injectable()
export class ThreadsService {
  constructor(
    @InjectRepository(ThreadRepository)
    private threadRepository: ThreadRepository,
    private userRepository: UserRepository,
    private messageRepository: MessageRepository,
  ) {}

  private messageLimit = 20

  async addMessage(
    threadId: number,
    messageType: MessageType,
    messageValue: string,
  ): Promise<any> {
    const message = new Message()
    message.type = messageType
    message.value = messageValue
    const thread = await this.threadRepository.findThreadWithSenderAndReceiver(
      threadId,
    )

    if (!thread) {
      throw new InternalServerErrorException()
    }

    const receiverTokens = await this.userRepository.getActiveUserDeviceTokens(
      thread.receiver,
    )

    const senderTokens = await this.userRepository.getActiveUserDeviceTokens(
      thread.sender,
    )

    message.thread = thread
    const threadWithNewMessage = await this.threadRepository.addMessage(
      thread.id,
      message,
      [...receiverTokens, ...senderTokens],
      this.messageLimit,
    )

    return threadWithNewMessage
  }

  async getMessages(
    sender: User,
    receiverId: number,
    lastMessageId: number,
    haveMessages: boolean,
    loadMessages: boolean,
    type: ThreadType = ThreadType.REGULAR,
  ): Promise<any> {
    const receiverUser = await this.userRepository.findOne(receiverId)
    const senderUser = await this.userRepository.findOne(sender.id)

    if (!receiverUser || !senderUser) {
      throw new NotFoundException('Sender or Receiver not found')
    }

    let thread: any
    if ((loadMessages || haveMessages) && lastMessageId > 0) {
      const messageExists = await this.messageRepository.findOne(
        lastMessageId,
        {
          relations: ['thread'],
        },
      )

      if (!messageExists) {
        throw new NotFoundException('Message with such does not find')
      }

      thread = await this.threadRepository.findThreadByTypeWithMessageRules(
        messageExists.thread.id,
        type,
        lastMessageId,
        loadMessages,
        loadMessages ? 0 : this.messageLimit,
      )
    }

    if (!thread || (Array.isArray(thread) && thread.length === 0)) {
      const threadExist = await this.threadRepository.findOne({
        sender: senderUser,
        receiver: receiverUser,
        type,
      })

      if (!threadExist) {
        const newThread = await this.threadRepository.createThread(
          senderUser,
          receiverUser,
          type,
        )

        return newThread
      }

      thread = await this.threadRepository.findThreadWithMessages(
        threadExist.id,
        loadMessages ? 0 : this.messageLimit,
      )
    }

    return thread
  }
}

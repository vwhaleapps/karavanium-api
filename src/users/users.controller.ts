import {
  Get,
  Body,
  Post,
  HttpCode,
  UseGuards,
  Controller,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiProperty,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger'
import { extname } from 'path'
import { diskStorage } from 'multer'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'

import { User } from './user.entity'
import { UsersService } from './users.service'
import { GetUser } from './get-user.decorator'
import { UserRepository } from './user.repository'
import { UserDeviceDto } from './dto/user-device.dto'
import { UserProfileDto } from './dto/user-profile.dto'
import { UserContactsDto } from './dto/user-contacts.dto'
import { ThreadsService } from '../threads/threads.service'

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard())
export class UsersController {
  SERVER_URL = 'http://161.35.20.152:3000/'

  constructor(
    private userService: UsersService,
    private threadService: ThreadsService,
    private userRepository: UserRepository,
  ) {}

  @ApiBody({
    type: UserDeviceDto,
    description: 'Click on `Schema` to see details 🔽',
  })
  @ApiCreatedResponse({
    description:
      'Created. The `push_token` has been successfully saved as new `device`. ',
  })
  @Post('push')
  saveUserDevice(
    @GetUser() user: User,
    @Body() userDeviceDto: UserDeviceDto,
  ): Promise<void> {
    return this.userService.addUserDevice(user.id, userDeviceDto)
  }

  @ApiResponse({
    description: 'Get User with list of devices',
    type: User,
  })
  @Get('push')
  getUserDevices(@GetUser() user: User): Promise<User> {
    return this.userService.getUserDevices(user)
  }

  @ApiBody({
    type: UserContactsDto,
    description: 'Click on `Schema` to see details 🔽',
  })
  @ApiResponse({
    description: 'Search and attach contacts to user',
    type: User,
  })
  @Post('contacts')
  addToContacts(
    @GetUser() user: User,
    @Body() userContactsDto: UserContactsDto,
  ): Promise<User> {
    return this.userService.checkAndSaveUserContacts(user, userContactsDto)
  }

  @ApiResponse({
    description: 'Get extended profile information',
    type: User,
  })
  @Get('profile')
  getProfile(@GetUser() user: User): Promise<User> {
    return this.userService.getProfile(user)
  }

  @ApiBody({
    type: UserContactsDto,
    description: 'Click on `Schema` to see details 🔽',
  })
  @ApiOkResponse({
    description: 'Update user profile data',
    type: User,
  })
  @Post('profile')
  @HttpCode(200)
  updateProfile(
    @GetUser() user: User,
    @Body() profileData: UserProfileDto,
  ): Promise<User> {
    return this.userService.updateProfile(user, profileData)
  }

  @ApiProperty({
    name: 'image',
    description: 'Attach file "image" to form data request',
  })
  @ApiOkResponse({
    description: 'Update user profile avatar',
    type: User,
  })
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './files',

        filename: (req: any, file: any, cb: any) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('')
          return cb(null, `${randomName}${extname(file.originalname)}`)
        },
      }),
    }),
  )
  async uploadedFile(
    @GetUser() user: User,
    @UploadedFile() file: any,
  ): Promise<any> {
    return this.userService.saveAvatar(user, `${this.SERVER_URL}${file.path}`)
  }
}

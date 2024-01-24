import { Equal, In } from 'typeorm'
import appDataSource from '../db'
import { handleError } from '../lib/errors'
import { getPaginationQueryParams } from '../lib/pagination'
import { Image } from '../models/image'
import { findOrCreateTags, getTagById } from './tag'
import { ImageTag } from '../models/imageTag'

type CreateImage = {
  tagTitles: string[]
  title: string | null
}

export async function createImage({ tagTitles, title }: CreateImage) {  
  try {
    const imageRepo = appDataSource.getRepository(Image)
  
    const image = new Image()
    image.title = title
  
    const tags = await findOrCreateTags(tagTitles)
    image.tags = tags

    return imageRepo.save(image)
  } catch (error: unknown) {
    handleError(error)
  }
}

type UpdateImage = {
  id: number
  tagTitles: string[]
  title: string | null
}

export async function updateImage({ id, tagTitles, title }: UpdateImage) {  
  try {
    const imageRepo = appDataSource.getRepository(Image)
    const oldImage = await getImage(id)
  
    if (!oldImage) {
      throw new Error(`No image found for the id ${id}`)
    }
  
    oldImage.title = title

    // delete existing many-to-many tags for the image before continuing
    const imageTagRepo = appDataSource.getRepository(ImageTag)
    const imageTags = await imageTagRepo.find({ where: { image_id: oldImage.id }})
    await imageTagRepo.remove(imageTags)

    const tags = await findOrCreateTags(tagTitles)
    oldImage.tags = tags

    return imageRepo.save(oldImage)
  } catch (error: unknown) {
    handleError(error)
  }
}

export async function deleteImage(id: number) {
  try {
    const imageRepo = appDataSource.getRepository(Image)
    const result = await imageRepo.delete(id)

    const rowDeleted = result?.affected === 1
    if (!rowDeleted) {
      throw new Error('Could not delete because an image with that id does not exist')
    }
  } catch (error: unknown) {
    handleError(error)
  }
}

export async function getImage(id: number) {
  try {
    const imageRepo = appDataSource.getRepository(Image)
    return imageRepo.findOne({
      where: {
        id: Equal(id)
      },
      relations: ['tags']
    })
  } catch (error: unknown) {
    handleError(error)
  }
}

type SearchImage = {
  page: number
}

export async function searchImages({ page }: SearchImage) {
  try {
    const imageRepo = appDataSource.getRepository(Image)
    const images = await imageRepo.find({
      select: {
        id: true,
        title: true
      },
      ...getPaginationQueryParams(page),
      relations: ['tags']
    })
  
    return images
  } catch (error: unknown) {
    handleError(error)
  }
}

type SearchImagesByTagId = {
  tagId: number
  page: number
}

export async function getImagesByTagId({ page, tagId }: SearchImagesByTagId) {
  try {
    const tag = await getTagById({ id: tagId })

    const imageRepo = appDataSource.getRepository(Image)
    const images = await imageRepo.find({
      where: {
        tags: tag
      },
      ...getPaginationQueryParams(page),
      relations: ['tags'],
      relationLoadStrategy: 'query'
    })
  
    return images
  } catch (error: unknown) {
    handleError(error)
  }
}

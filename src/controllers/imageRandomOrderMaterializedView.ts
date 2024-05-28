import { In } from 'typeorm'
import appDataSource from '../db'
import { handleLogError, handleThrowError } from '../lib/errors'
import { getPaginationQueryParams } from '../lib/pagination'
import { Image } from '../models/image'
import { ImageRandomOrderMaterializedView } from '../models/imageRandomOrderMaterializedView'
import { ImageType } from '../types'
import { getImageTypesArray } from './image'

export async function refreshImageRandomOrderMaterializedView() {
  try {
    await appDataSource.manager.query('REFRESH MATERIALIZED VIEW image_random_order_materialized_view')
  } catch (error) {
    handleLogError(`refreshImageRandomOrderMaterializedView error: ${error}`)
  }
}

export async function queryImageRandomOrderMaterializedView(page: number, imageType: ImageType) {
  try {
    const imageRandomOrderMaterializedViewRepo = appDataSource.getRepository(ImageRandomOrderMaterializedView)
    const paginationParams = getPaginationQueryParams(page)

    const whereType = getImageTypesArray(imageType)

    let query = imageRandomOrderMaterializedViewRepo
      .createQueryBuilder('image_random_order_materialized_view')
      .select('image_random_order_materialized_view.id')
      .skip(paginationParams.skip)
      .take(paginationParams.take)

    if (whereType.length > 0) {
      query = query.where('image_random_order_materialized_view.type IN (:...types)', { types: whereType })
    }

    const ids = await query.getRawMany()

    const imageIds = ids.map(row => row.image_random_order_materialized_view_id)

    const imageRepo = appDataSource.getRepository(Image)
    let images = await imageRepo.find({
      where: {
        id: In(imageIds)
      }
    })

    images = images.sort((a, b) => imageIds.indexOf(a.id) - imageIds.indexOf(b.id));

    return images
  } catch (error) {
    handleThrowError(`queryImageRandomOrderMaterializedView error: ${error}`)
  }
}

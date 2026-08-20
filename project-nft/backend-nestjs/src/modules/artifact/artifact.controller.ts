// [文物展馆模块] - 控制器
// 2 个端点：
//   1. GET  /artifacts      公开  文物展品列表
//   2. GET  /artifacts/:id  公开  文物展品详情
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { ArtifactService } from './artifact.service';
import { ArtifactQueryDto } from './dto/artifact-query.dto';

@ApiTags('文物展馆模块')
@Controller()
export class ArtifactController {
  constructor(private readonly artifactService: ArtifactService) {}

  @Public()
  @Get('artifacts')
  @ApiOperation({ summary: '文物展品列表' })
  getArtifacts(@Query() query: ArtifactQueryDto) {
    return this.artifactService.getArtifacts(query);
  }

  @Public()
  @Get('artifacts/:id')
  @ApiOperation({ summary: '文物展品详情' })
  getArtifactById(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
  ) {
    return this.artifactService.getArtifactById(id);
  }
}

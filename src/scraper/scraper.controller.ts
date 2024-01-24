import { Controller, Post, Body, Delete } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { CreateScraperDto } from './dto/create-scraper.dto';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  //scrapes related data and gives desired output
  @Post()
  async scrape(@Body() createScraperDto: CreateScraperDto) {
    //gets all the text content from pdfs found with given url and keyword
    const textData = await this.scraperService.getPdfsText(createScraperDto);

    //splits text data in chunks
    const splittedTexts =
      await this.scraperService.splitTextIntoChunks(textData);

    //converts text chunks into embeddings
    const embeddings =
      await this.scraperService.createEmbeddings(splittedTexts);

    //stores embeddings in pinecone with metadata
    await this.scraperService.storeInPinecone(embeddings, splittedTexts);

    //generates an embedding to query pinecone
    const pineconeQueryEmbedding =
      await this.scraperService.generateEmbeddingToQueryPinecone();

    //returns all chunks related to the query
    const pineconeResponse = await this.scraperService.queryPinecone(
      pineconeQueryEmbedding,
    );

    //returns required data which can be inserted in excel file
    const requiredOutput =
      await this.scraperService.getOpenaiOutput(pineconeResponse);

    return requiredOutput;
  }

  //temp endpoint to empty pinecone store
  @Delete('pinecone')
  async emptyPineconeStore() {
    await this.scraperService.emptyPineconeStore();
  }
}

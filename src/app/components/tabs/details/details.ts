import { Component, computed, inject } from '@angular/core';
import { TabBase } from '../tab-base/tab-base';
import { HCDPVisSubtypes } from '../../../models/datasets/dataset';
import { DomSanitizer } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-details',
  imports: [MatCardModule, MatProgressSpinnerModule],
  templateUrl: './details.html',
  styleUrl: './details.scss',
})
export class Details extends TabBase {
  private sanitizer = inject(DomSanitizer);

  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });

  dsLabel = computed(() => {
    return this.dataset().label;
  });

  dsDescription = computed(() => {
    return this.dataset().description;
  });

  isExperimental = computed(() => {
    return !!this.typedDataset().warnings?.experimental;
  });

  usageWarning = computed(() => {
    let usage = this.typedDataset().warnings?.usage;
    if(usage) {
      return this.sanitizer.bypassSecurityTrustHtml(usage);
    }
    return undefined;
  });

  detailBlocks = computed(() => {
    return this.typedDataset().detailBlocks;
  });

  metadata = computed(() => {
    // return this.typedDataset().dataStreams.getStreamsOfType("");
    return `
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam sapien nunc, placerat consectetur condimentum eget, sollicitudin molestie justo. Aliquam erat volutpat. Nulla risus mi, tincidunt eget augue eget, interdum gravida libero. Duis vehicula felis vel nisl eleifend, vel aliquam lacus ultrices. Nulla nisl quam, varius nec lobortis vitae, tempus a nulla. Duis a aliquet turpis. Sed ex leo, eleifend sit amet enim nec, laoreet scelerisque massa. Duis sit amet mi sit amet purus venenatis mollis. Pellentesque sit amet pulvinar augue. Vestibulum cursus tristique cursus.

      Quisque lobortis neque in tempus accumsan. Nam dignissim, nisl non dapibus luctus, lorem metus rutrum risus, nec semper tortor erat ut dui. Vestibulum aliquam ex et turpis pulvinar, eget vehicula nisl rutrum. Sed risus arcu, dictum vel varius imperdiet, pretium eget ligula. Aenean viverra felis nec lacus finibus, ut pretium elit commodo. Suspendisse ac quam eu massa porta malesuada. Sed tristique lacus metus. Nullam varius imperdiet hendrerit. Donec turpis mi, porta vitae magna eget, rutrum pulvinar ante.

      Nullam condimentum tristique enim sit amet suscipit. Suspendisse scelerisque interdum venenatis. Nulla rhoncus in nisi in aliquam. Aenean et enim dignissim tellus cursus porta sed non nibh. Ut turpis velit, tincidunt eu velit a, vestibulum consequat elit. Nullam vel massa id nisl dictum vestibulum. Ut dignissim vulputate arcu, eu consequat nisi ullamcorper ut. Donec ac libero tincidunt, dignissim tortor et, ornare dolor.

      Ut tincidunt venenatis metus quis dictum. Donec non felis tortor. Sed ipsum nisl, sodales in rhoncus at, mattis sit amet magna. Donec felis risus, pulvinar at libero at, dignissim lacinia ligula. Fusce vestibulum enim mauris. Vivamus mattis, lorem a tincidunt pretium, magna nulla ornare purus, id venenatis lacus urna gravida mauris. Integer luctus eros at sapien placerat, eleifend molestie augue dictum. Duis urna ipsum, interdum ac lorem at, facilisis mollis tortor. Etiam ac sem accumsan, hendrerit leo a, elementum ante.

      Cras dapibus libero eget dui malesuada tristique. Ut cursus suscipit turpis, eu ullamcorper mi sodales eu. Aliquam id nibh id magna vestibulum ultrices vel ut tellus. Donec finibus ultricies fringilla. Vivamus efficitur tristique risus ut sollicitudin. Suspendisse tortor nisi, molestie quis tincidunt nec, aliquet vel risus. Duis in purus tellus. Fusce pretium, turpis et consequat suscipit, elit turpis gravida metus, et cursus enim ex ut est. Etiam ut libero sit amet dui maximus feugiat vel a orci.
    `;
  });
}

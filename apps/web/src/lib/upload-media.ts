import api from '@/lib/api';

export type UploadedMedia = {
  id: string;
  url: string;
  originalName: string;
  altText?: string | null;
};

export async function uploadProductImage(file: File): Promise<UploadedMedia> {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<{ data: UploadedMedia }>('/media/upload', form, {
    timeout: 60_000,
    transformRequest: [
      (data, headers) => {
        if (headers) {
          delete headers['Content-Type'];
          delete headers['content-type'];
        }
        return data;
      },
    ],
  });
  return response.data.data;
}
